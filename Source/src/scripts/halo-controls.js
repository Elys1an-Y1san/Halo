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
  const refreshRuntime = async () => {
    const generation = ++statusRevision;
    let text, retry = false;
    try {
      const [tab] = await api.tabs.query({active:true,currentWindow:true});
      if (siteFor(new URL(tab?.url || 'about:blank').hostname) !== site) text = '设置将用于所选网站；请打开对应的视频页';
      else {
        const result = await api.tabs.sendMessage(tab.id, {type:'halo-status'});
        if (!result?.status) throw Error('No renderer');
        text = result.status;
      }
    } catch { text = '无法连接视频页，请授权并刷新视频页后重试'; retry = true; }
    if (generation === statusRevision) HaloUI.runtime(root, text, retry);
  };
  const preferences = HaloUI.bindPreferences(root, {
    get: () => settings,
    commit: next => { ++revision; settings = HaloUI.normalize(next); render(); save(); refreshRuntime(); },
    compare: sendCompare,
    retry: async () => {
      try { const [tab] = await api.tabs.query({active:true,currentWindow:true}); await api.tabs.sendMessage(tab.id, {type:'halo-retry'}); } catch { /* Status gives connection recovery instructions. */ }
      refreshRuntime();
    },
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
  select.onchange = () => { preferences.resetContext(); site = select.value; ++statusRevision; load(); };
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
