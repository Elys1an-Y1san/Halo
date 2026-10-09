(() => {
  'use strict';
  const api = globalThis.browser || globalThis.chrome;
  const popup = document.body?.dataset.halo === 'popup';
  if (!popup && document.getElementById('halo-youtube-ui')) return;
  const defaults = HaloUI.normalize();
  let comparing = false, compareTimer, heartbeat, comparedTab, statusGeneration = 0;
  const preferenceSource = crypto.randomUUID();
  let saveQueue = Promise.resolve();
  let site = 'youtube', settings = { ...defaults }, loadGeneration = 0;
  const key = () => ({youtube:'halo-youtube-v1',bilibili:'ambientlight-bilibili-v1',x:'halo-x-v1'})[site];
  const siteFor = hostname => ['x.com','www.x.com','twitter.com','www.twitter.com'].includes(hostname) ? 'x' : ['www.bilibili.com','player.bilibili.com','live.bilibili.com'].includes(hostname) ? 'bilibili' : hostname==='www.youtube.com' ? 'youtube' : null;
  const host = popup ? document.querySelector('#controls') : document.createElement('div');
  if (!popup) { host.id = 'halo-youtube-ui'; host.hidden = !document.querySelector('video'); document.documentElement.append(host); }
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${HaloUI.css}${popup ? HaloUI.popupCss : ""}</style>${HaloUI.markup}`;
  const $ = id => root.getElementById(id);
  HaloUI.bindUpdates(root, api);
  const panelMotion = HaloUI.createPanel(root, { popup });
  const wave = popup ? null : HaloWave.create({
    host, trigger: () => { panelMotion.settle(); return panelMotion.isOpen ? $('enabled') : $('toggle'); },
    layers: () => document.querySelectorAll('.ambientlight__container'),
    ready: () => document.documentElement.hasAttribute('data-ambientlight-enabled') && !!document.querySelector('.ambientlight__container'),
    themeAttribute: 'data-ambientlight-enabled',
    surfaceSelector: 'ytd-app,ytd-masthead,#background.ytd-masthead,#description,#secondary,ytd-watch-metadata,yt-formatted-string,ytd-comments,ytd-playlist-panel-renderer,ytd-engagement-panel-section-list-renderer,yt-chip-cloud-renderer',
  });
  const setOpen = value => { panelMotion.setOpen(value); HaloUI.place(host,settings,document.querySelector('video')); };
  setOpen(popup);
  $('toggle').onclick = () => setOpen(!panelMotion.isOpen);
  $('close').onclick = () => { setOpen(false); $('toggle').focus(); };
  root.addEventListener('keydown', e => { if (e.key === 'Escape' && !popup) { setOpen(false); $('toggle').focus(); } });
  const normalize = value => HaloUI.normalize(value);
  const render = () => {
    HaloUI.sync(root, settings);
    HaloUI.place(host,settings,document.querySelector("video"));
  };
  let applying = false;
  const apply = () => {
    if (popup || applying) return;
    const enabled = document.getElementById('setting-enabled');
    if (!enabled) { HaloUI.runtime(root,'等待播放器；请确认网站访问权限',true); return; }
    applying = true;
    try {
      if (enabled.getAttribute('aria-checked') !== String(comparing ? false : (wave?.renderingEnabled ?? settings.enabled))) enabled.click();
      for (const [name, setting] of [['blur2','blur'],['spread','spread'],['brightness','brightness']]) {
        const input = document.getElementById(`setting-${name}-range`);
        if (input && Number(input.value) !== settings[setting]) { input.value = settings[setting]; input.dispatchEvent(new Event('change', { bubbles: true })); }
      }
      const limit=document.getElementById('setting-framerateLimit-range');
      const fps=HaloUI.qualities[settings.quality];
      if(limit && Number(limit.value)!==fps){limit.value=fps;limit.dispatchEvent(new Event('change',{bubbles:true}));}
      showRuntime();
    } finally { applying = false; }
  };
  const save = async () => {
    const name = key(), value = { ...settings, __haloSource: preferenceSource };
    try { saveQueue = saveQueue.catch(() => {}).then(() => api.storage.local.set({ [name]: value })); await saveQueue; }
    catch { $('status').textContent = '保存失败，请重新打开扩展重试'; }
  };
  const updateControls = previous => {
    render();
    if (wave && previous !== settings.enabled) wave.toggle(settings.enabled, apply);
    else apply();
  };
  const runtimeState = () => {
    const video=document.querySelector('video');
    if(comparing)return '正在对比原画，个人设置未改变';
    if(!settings.enabled)return '已关闭，调整将在开启后生效';
    if(!video || video.readyState<2)return '等待视频画面';
    if(document.hidden || document.fullscreenElement || document.pictureInPictureElement)return '已暂停渲染';
    if(!document.getElementById('setting-enabled'))return '等待播放器；请刷新视频页重试';
    if(!document.documentElement.hasAttribute('data-ambientlight-enabled') || !document.querySelector('.ambientlight__container'))return '等待环境光渲染';
    return video.paused?'视频已暂停，保留当前光效':'环境光正在生效';
  };
  const showRuntime = () => HaloUI.runtime(root,runtimeState());
  const localCompare = value => {
    comparing=value; clearTimeout(compareTimer);
    // The lease recovers even if a popup closes before its cleanup message arrives.
    if(value)compareTimer=setTimeout(()=>localCompare(false),2500);
    apply();showRuntime();
  };
  const sendCompare = async value => {
    if(!popup){localCompare(value); if(value){clearInterval(heartbeat);heartbeat=setInterval(()=>localCompare(true),1000);}else clearInterval(heartbeat);return true;}
    if(!value){clearInterval(heartbeat);if(comparedTab!=null)await api.tabs.sendMessage(comparedTab,{type:'halo-compare',value:false}).catch(()=>{});comparedTab=null;return true;}
    const [tab]=await api.tabs.query({active:true,currentWindow:true});
    if(!tab?.url || siteFor(new URL(tab.url).hostname)!==site)throw Error('Wrong site');
    const result=await api.tabs.sendMessage(tab.id,{type:'halo-compare',value:true});
    if(!result?.ok)throw Error('No renderer');comparedTab=tab.id;
    clearInterval(heartbeat);heartbeat=setInterval(()=>api.tabs.sendMessage(tab.id,{type:'halo-compare',value:true}).catch(()=>clearInterval(heartbeat)),1000);return true;
  };
  const refreshRuntime = async () => {
    if(!popup){apply();showRuntime();return;}
    const generation=++statusGeneration;
    let text, retry=false;
    try {
      const [tab]=await api.tabs.query({active:true,currentWindow:true});
      const hostname=new URL(tab?.url || 'about:blank').hostname;
      if(siteFor(hostname)!==site) text='设置将用于所选网站；请打开对应的视频页';
      else {const result=await api.tabs.sendMessage(tab.id,{type:'halo-status'});if(!result?.status)throw Error();text=result.status;}
    }catch{text='无法连接视频页，请授权并刷新视频页后重试';retry=true;}
    if(generation===statusGeneration)HaloUI.runtime(root,text,retry);
  };
  const preferences=HaloUI.bindPreferences(root,{
    get:()=>settings,
    commit:next=>{++loadGeneration;if(next.position!==settings.position || next.anchor!==settings.anchor)wave?.finish();const previous=settings.enabled;settings=normalize(next);updateControls(previous);save();refreshRuntime();},
    compare:sendCompare,retry:refreshRuntime,place:()=>HaloUI.place(host,settings,document.querySelector('video')),
  });
  if(!popup)HaloUI.bindDrag(root,{get:()=>settings,beforeMove:()=>wave?.finish(),commit:anchor=>{++loadGeneration;settings={...settings,anchor};render();save();}});
  const load = async () => {
    const generation = ++loadGeneration, name = key();
    try { const saved = await api.storage.local.get(name); if (generation !== loadGeneration) return; settings = normalize(saved[name]); }
    catch { if (generation !== loadGeneration) return; settings = { ...defaults }; }
    wave?.setInitial(settings.enabled); render(); apply(); refreshRuntime();
  };
  api.storage.onChanged.addListener((changes, area) => { if (area !== 'local' || !changes[key()]) return; if (changes[key()].newValue?.__haloSource === preferenceSource) return; const previous = settings.enabled; settings = normalize(changes[key()].newValue); updateControls(previous); });
  if (popup) {
    const select = document.querySelector('#site');
    select.onchange = () => { preferences.resetContext(); site = select.value; ++statusGeneration; load();refreshRuntime(); };
    api.tabs.query({ active:true, currentWindow:true }).then(tabs => {
      const detected=siteFor(new URL(tabs[0]?.url || 'about:blank').hostname);
      if (loadGeneration === 1 && detected && detected!==site) { site=detected; select.value=site; load(); }
    }).catch(() => {});
    document.querySelector('#open-page').onclick = async () => {
      try { const [tab] = await api.tabs.query({ active:true, currentWindow:true }); const reply = await api.tabs.sendMessage(tab.id, { type:'halo-open' }); if (!reply?.ok) throw Error(); window.close(); }
      catch { $('status').textContent = '请在授权的视频页刷新后再打开'; }
    };
  } else {
    api.runtime.onMessage.addListener((message, sender, reply) => { if(message.type==='halo-status'){reply({status:runtimeState()});return;} if(message.type==='halo-compare'){localCompare(!!message.value);reply({ok:true});return;} if (message.type === 'halo-open') { if (!document.querySelector('video')) { reply({ok:false}); return; } host.hidden = false; setOpen(true); reply({ok:true}); } });
    let pending;
    new MutationObserver(() => { if (pending) return; pending = setTimeout(() => { pending = null; apply(); host.hidden = !document.querySelector('video') || !!document.fullscreenElement; }, 200); }).observe(document.documentElement, { subtree:true,childList:true });
    document.addEventListener('fullscreenchange', () => { host.hidden = !!document.fullscreenElement; });
  }
  const statusInterval=setInterval(()=>{ if(!document.hidden)refreshRuntime(); },1500);
  window.addEventListener('pagehide',()=>{clearInterval(statusInterval);clearInterval(heartbeat);});
  window.addEventListener('resize',()=>HaloUI.place(host,settings,document.querySelector('video')));
  window.addEventListener('scroll',()=>HaloUI.place(host,settings,document.querySelector('video')),{passive:true});
  load();
})();
