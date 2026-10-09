/* Popup preferences communicate directly with Halo's content engine. */
(() => {
  'use strict';
  const api = globalThis.browser || globalThis.chrome;
  const host = document.querySelector('#controls');
  if (!host || host.shadowRoot) return;
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${HaloUI.css}${HaloUI.popupCss}</style>${HaloUI.markup}`;
  const $ = id => root.getElementById(id);
  HaloUI.bindUpdates(root, api);
  HaloUI.createPanel(root, { popup: true }).setOpen(true);
  let site = 'youtube', settings = HaloUI.normalize(), revision = 0, statusRevision = 0;
  let saveQueue = Promise.resolve(), heartbeat, comparedTab;
  const source = crypto.randomUUID();
  const key = () => ({youtube:'halo-youtube-v1',bilibili:'ambientlight-bilibili-v1',x:'halo-x-v1'})[site];
  const siteFor = hostname => ['x.com','www.x.com','twitter.com','www.twitter.com'].includes(hostname) ? 'x' : ['www.bilibili.com','player.bilibili.com','live.bilibili.com'].includes(hostname) ? 'bilibili' : hostname === 'www.youtube.com' ? 'youtube' : null;
  const render = () => { HaloUI.sync(root, settings); HaloUI.place(host, settings, null); };
  const save = () => {
    const name = key(), value = {...settings, __haloSource: source};
    saveQueue = saveQueue.catch(() => {}).then(() => api.storage.local.set({[name]:value}))
      .catch(() => { $('status').textContent = '设置保存失败，请重试'; });
  };
  const sendCompare = async value => {
    if (!value) {
      clearInterval(heartbeat);
      if (comparedTab != null) await api.tabs.sendMessage(comparedTab, {type:'halo-compare',value:false}).catch(() => {});
      comparedTab = null;
      return true;
    }
    const [tab] = await api.tabs.query({active:true,currentWindow:true});
    if (!tab?.url || siteFor(new URL(tab.url).hostname) !== site) throw Error('Wrong site');
    const result = await api.tabs.sendMessage(tab.id, {type:'halo-compare',value:true});
    if (!result?.ok) throw Error('No renderer');
    comparedTab = tab.id;
    clearInterval(heartbeat);
    heartbeat = setInterval(() => api.tabs.sendMessage(tab.id, {type:'halo-compare',value:true}).catch(() => clearInterval(heartbeat)), 1000);
    return true;
  };
  let recovery = null, recovering = false, refreshing = false;
  const bounded = operation => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Connection timed out')), 1200);
    Promise.resolve(operation).then(resolve, reject).finally(() => clearTimeout(timer));
  });
  const refreshRuntime = async () => {
    if (refreshing || recovering) return;
    refreshing = true;
    const generation = ++statusRevision, selectedSite = site;
    let text, action = null, tab;
    try {
      [tab] = await bounded(api.tabs.query({active:true,currentWindow:true}));
      if (siteFor(new URL(tab?.url || 'about:blank').hostname) !== selectedSite) text = '设置将用于所选网站；请打开对应的视频页';
      else {
        try {
          const result = await bounded(api.tabs.sendMessage(tab.id, {type:'halo-status'}));
          if (!result?.status) throw Error('No renderer');
          text = result.status;
          if (result.retry) action = {type:'retry',label:'重新采样',tab};
        } catch {
          // A working renderer is stronger evidence than a permission inventory
          // that may omit a temporary active-tab grant. Inspect access only on failure.
          const origin = new URL(tab.url).origin + '/*';
          const allowed = api.permissions?.contains ? await bounded(api.permissions.contains({origins:[origin]})).catch(() => null) : null;
          if (allowed === false) {
            text = '尚未获得此网站访问权限，请授权后刷新视频页';
            if (api.permissions?.request) action = {type:'authorize',label:'授权网站',tab,origin};
            else text = '尚未获得网站权限，请在浏览器扩展设置中允许此网站后刷新';
          } else {
            text = '视频页连接已失效或未加载扩展，刷新后重新连接；若仍失败，请检查网站权限';
            if (api.tabs.reload) action = {type:'reload',label:'刷新视频页',tab};
          }
        }
      }
    } catch { text = '无法查询视频页，请重新打开面板并检查网站访问权限'; }
    finally { refreshing = false; }
    if (generation === statusRevision && selectedSite === site) {
      recovery = action;
      HaloUI.runtime(root, text, action?.label || false);
    }
  };
  const recover = async () => {
    const action = recovery, selectedSite = site;
    if (!action || recovering) return;
    recovering = true;
    ++statusRevision;
    $('retry').disabled = true;
    try {
      // Request permission immediately in the click gesture, before any await.
      if (action.type === 'authorize') {
        const granted = await api.permissions.request({origins:[action.origin]});
        if (!granted) { if (selectedSite === site) HaloUI.runtime(root, '未获得网站权限，可再次授权', action.label); return; }
      }
      const [tab] = await bounded(api.tabs.query({active:true,currentWindow:true}));
      // Never reload a different page after tab navigation or site selection.
      if (selectedSite !== site || tab?.id !== action.tab.id || tab?.url !== action.tab.url) return;
      if (action.type === 'retry') {
        const reply = await bounded(api.tabs.sendMessage(tab.id, {type:'halo-retry'}));
        if (!reply?.ok) throw Error('No renderer');
      } else {
        await bounded(api.tabs.reload(tab.id));
      }
      if (selectedSite !== site) return;
      recovery = null;
      HaloUI.runtime(root, action.type === 'retry' ? '正在重新连接视频画面…' : '正在刷新视频页，播放后自动恢复…');
    } catch {
      if (selectedSite === site) HaloUI.runtime(root, '恢复未完成，请检查网站权限后重试', action.label);
    } finally {
      recovering = false;
      $('retry').disabled = false;
    }
  };
  const preferences = HaloUI.bindPreferences(root, {
    get: () => settings,
    commit: next => { ++revision; settings = HaloUI.normalize(next); render(); save(); refreshRuntime(); },
    compare: sendCompare,
    retry: recover,
    place: () => HaloUI.place(host, settings, null),
  });
  const load = async () => {
    const generation = ++revision, name = key();
    try {
      const saved = await api.storage.local.get(name);
      if (generation !== revision) return;
      settings = HaloUI.normalize(saved[name]);
    } catch { if (generation !== revision) return; settings = HaloUI.normalize(); }
    render(); refreshRuntime();
  };
  api.storage.onChanged.addListener((changes, area) => {
    const change = changes[key()];
    if (area !== 'local' || !change || change.newValue?.__haloSource === source) return;
    ++revision; settings = HaloUI.normalize(change.newValue); render(); refreshRuntime();
  });
  const select = document.querySelector('#site');
  select.onchange = () => { preferences.resetContext(); site = select.value; recovery = null; HaloUI.runtime(root, '正在连接视频页…'); ++statusRevision; load(); };
  api.tabs.query({active:true,currentWindow:true}).then(tabs => {
    const detected = siteFor(new URL(tabs[0]?.url || 'about:blank').hostname);
    if (revision === 1 && detected && detected !== site) { site = detected; select.value = site; load(); }
  }).catch(() => {});
  document.querySelector('#open-page').onclick = async () => {
    try {
      const [tab] = await api.tabs.query({active:true,currentWindow:true});
      const reply = await api.tabs.sendMessage(tab.id, {type:'halo-open'});
      if (!reply?.ok) throw Error('No player');
      window.close();
    } catch { $('status').textContent = '请在授权的视频页刷新后再打开'; }
  };
  const interval = setInterval(() => { if (!document.hidden) refreshRuntime(); }, 1500);
  window.addEventListener('pagehide', () => { clearInterval(interval); sendCompare(false); });
  load();
})();
