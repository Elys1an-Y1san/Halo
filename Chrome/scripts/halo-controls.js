(() => {
  'use strict';
  const api = globalThis.browser || globalThis.chrome;
  const popup = document.body?.dataset.halo === 'popup';
  const defaults = { enabled: true, blur: 60, spread: 100, brightness: 100 };
  const preferenceSource = crypto.randomUUID();
  let saveQueue = Promise.resolve();
  let site = 'youtube', settings = { ...defaults }, loadGeneration = 0;
  const key = () => site === 'bilibili' ? 'ambientlight-bilibili-v1' : 'halo-youtube-v1';
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
  const setOpen = value => panelMotion.setOpen(value);
  setOpen(popup);
  $('toggle').onclick = () => setOpen(!panelMotion.isOpen);
  $('close').onclick = () => { setOpen(false); $('toggle').focus(); };
  root.addEventListener('keydown', e => { if (e.key === 'Escape' && !popup) { setOpen(false); $('toggle').focus(); } });
  const normalize = value => {
    const result = { ...defaults };
    if (typeof value?.enabled === 'boolean') result.enabled = value.enabled;
    for (const k of ['blur', 'spread', 'brightness']) {
      const n = Number(value?.[k]);
      if (value?.[k] != null && Number.isFinite(n)) result[k] = Math.max(Number($(k).min), Math.min(Number($(k).max), n));
    }
    return result;
  };
  const render = () => {
    HaloUI.sync(root, settings);
  };
  let applying = false;
  const apply = () => {
    if (popup || applying) return;
    const enabled = document.getElementById('setting-enabled');
    if (!enabled) { $('status').textContent = '等待播放器；请确认网站访问权限'; return; }
    applying = true;
    try {
      if (enabled.getAttribute('aria-checked') !== String(wave?.renderingEnabled ?? settings.enabled)) enabled.click();
      for (const [name, setting] of [['blur2','blur'],['spread','spread'],['brightness','brightness']]) {
        const input = document.getElementById(`setting-${name}-range`);
        if (input && Number(input.value) !== settings[setting]) { input.value = settings[setting]; input.dispatchEvent(new Event('change', { bubbles: true })); }
      }
      $('status').textContent = settings.enabled ? '' : '环境光已关闭';
    } finally { applying = false; }
  };
  const save = async () => {
    const name = key(), value = { ...settings, __haloSource: preferenceSource };
    try { saveQueue = saveQueue.catch(() => {}).then(() => api.storage.local.set({ [name]: value })); await saveQueue; if (popup && name === key()) $('status').textContent = ''; }
    catch { $('status').textContent = '保存失败，请重新打开扩展重试'; }
  };
  const updateControls = previous => {
    render();
    if (wave && previous !== settings.enabled) wave.toggle(settings.enabled, apply);
    else apply();
  };
  for (const name of ['enabled', 'blur', 'spread', 'brightness']) $(name).addEventListener(name === 'enabled' ? 'change' : 'input', () => {
    const previous = settings.enabled;
    settings[name] = name === 'enabled' ? $(name).checked : Number($(name).value); updateControls(previous); save();
  });
  root.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => { settings = { ...settings, ...HaloUI.presets[b.dataset.preset] }; render(); apply(); save(); });
  $('reset').onclick = () => { const previous = settings.enabled; settings = { ...defaults }; updateControls(previous); save(); };
  const load = async () => {
    const generation = ++loadGeneration, name = key();
    try { const saved = await api.storage.local.get(name); if (generation !== loadGeneration) return; settings = normalize(saved[name]); }
    catch { settings = { ...defaults }; }
    wave?.setInitial(settings.enabled); render(); apply(); if (popup) $('status').textContent = '';
  };
  api.storage.onChanged.addListener((changes, area) => { if (area !== 'local' || !changes[key()]) return; if (changes[key()].newValue?.__haloSource === preferenceSource) return; const previous = settings.enabled; settings = normalize(changes[key()].newValue); updateControls(previous); });
  if (popup) {
    const select = document.querySelector('#site');
    select.onchange = () => { site = select.value; load(); };
    api.tabs.query({ active:true, currentWindow:true }).then(tabs => {
      if (tabs[0]?.url?.includes('bilibili.com')) { site = 'bilibili'; select.value = site; load(); }
    }).catch(() => {});
    document.querySelector('#open-page').onclick = async () => {
      try { const [tab] = await api.tabs.query({ active:true, currentWindow:true }); const reply = await api.tabs.sendMessage(tab.id, { type:'halo-open' }); if (!reply?.ok) throw Error(); window.close(); }
      catch { $('status').textContent = '请在授权的视频页刷新后再打开'; }
    };
  } else {
    api.runtime.onMessage.addListener((message, sender, reply) => { if (message.type === 'halo-open') { if (!document.querySelector('video')) { reply({ok:false}); return; } host.hidden = false; setOpen(true); reply({ok:true}); } });
    let pending;
    new MutationObserver(() => { if (pending) return; pending = setTimeout(() => { pending = null; apply(); host.hidden = !document.querySelector('video') || !!document.fullscreenElement; }, 200); }).observe(document.documentElement, { subtree:true,childList:true });
    document.addEventListener('fullscreenchange', () => { host.hidden = !!document.fullscreenElement; });
  }
  load();
})();
