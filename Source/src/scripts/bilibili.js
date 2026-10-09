/* Shared video adapter. Site policies own route and player selection. */
(() => {
  'use strict';
  const api = globalThis.browser || globalThis.chrome;
  const policy = globalThis.HaloX || HaloBilibili;
  const isX = !!globalThis.HaloX;
  const KEY = isX ? 'halo-x-v1' : 'ambientlight-bilibili-v1';
  const hostId = isX ? 'halo-x-ui' : 'bili-ambient-ui';
  const layerId = isX ? 'halo-x-layer' : 'bili-ambient-layer';
  const themeAttribute = isX ? 'data-halo-x' : 'data-bili-ambient';
  const preferenceSource = crypto.randomUUID();
  const defaults = HaloUI.normalize();
  let settings = { ...defaults }, comparing = false, compareTimer;
  const normalize = value => HaloUI.normalize(value);
  const supported = () => policy.supports(new URL(location.href));
  if (document.getElementById(hostId)) return;

  const layer = document.createElement('div');
  layer.id = layerId;
  layer.hidden = true;
  layer.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  const pictureFrame = isX ? document.createElement('div') : layer;
  if(isX){pictureFrame.style.cssText='position:absolute;inset:0;pointer-events:none';layer.append(pictureFrame);}
  pictureFrame.append(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const host = document.createElement('div');
  host.id = hostId;
  // Reserve the singleton before storage.get yields: Safari can inject twice
  // while the first instance is still loading its preferences.
  host.hidden = true;
  document.documentElement.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${HaloUI.css}</style>${HaloUI.markup}`;
  const $ = (id) => shadow.getElementById(id);
  HaloUI.bindUpdates(shadow, api);
  const panelMotion = HaloUI.createPanel(shadow);
  const wave = HaloWave.create({
    host, trigger: () => { panelMotion.settle(); return panelMotion.isOpen ? $('enabled') : $('toggle'); },
    layers: () => [layer], ready: () => canDraw() && drawn,
    themeAttribute, animateSurfaces: !isX,
    surfaceSelector: isX ? '#halo-x-layer' : '#app,#video-page-app,#mirror-vdcon,.bili-header__bar,.video-info-title,.video-title,.up-name,.video-page-card-small .title,.video-desc-container,.video-pod,.video-sections-content-list,.base-video-sections,.playlist-container',
  });
  const status = $('status');
  const setStatus = (text) => { if (status.textContent !== text) status.textContent = text; };
  const setOpen = open => { panelMotion.setOpen(open); HaloUI.place(host,settings,video); };
  const syncHost = () => {
    const hidden = (isX && !video) || !supported() || !!document.fullscreenElement || !!document.webkitFullscreenElement ||
      document.body?.classList.contains('webscreen-fix');
    if (hidden && panelMotion.isOpen) { setOpen(false); panelMotion.settle(); }
    host.hidden = !!hidden;
  };
  $('toggle').addEventListener('click', () => setOpen(!panelMotion.isOpen));
  $('close').addEventListener('click', () => { setOpen(false); $('toggle').focus(); });
  shadow.addEventListener('keydown', (event) => { if (event.key === 'Escape') { setOpen(false); $('toggle').focus(); } });
  const renderControls = () => {
    HaloUI.sync(shadow, settings);
    HaloUI.place(host,settings,video);
  };
  const updateControls = previous => {
    renderControls();
    if (previous !== settings.enabled) wave.toggle(settings.enabled, update);
    else update();
  };
  let saveTimer;
  let saveQueue = Promise.resolve();
  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const snapshot = { ...settings, __haloSource: preferenceSource };
      saveQueue = saveQueue.catch(() => {}).then(() => api.storage.local.set({ [KEY]: snapshot }))
        .catch(() => setStatus('设置保存失败，请重试'));
    }, 150);
  };
  let video = null;
  let frameId = null;
  let frameOwner = null;
  let rafId = null;
  let lastDraw = -Infinity;
  let failedSource = null;
  let observedSource = null;
  let inViewport = true;
  let drawn = false, geometryDirty = true;
  const cancelFrame = () => {
    if (frameId !== null) frameOwner?.cancelVideoFrameCallback?.(frameId);
    if (rafId !== null) cancelAnimationFrame(rafId);
    frameId = rafId = null; frameOwner = null;
  };
  const visible = () => !comparing && wave.renderingEnabled && supported() && !!video && video.isConnected &&
    !document.hidden && !document.fullscreenElement && !document.webkitFullscreenElement &&
    !video.webkitDisplayingFullscreen && !document.pictureInPictureElement &&
    video.webkitPresentationMode !== 'picture-in-picture' && inViewport;
  const canDraw = () => visible() && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
  const syncLayer = () => {
    const active = canDraw() && drawn;
    if (layer.hidden === active) layer.hidden = !active;
    if (document.documentElement.hasAttribute(themeAttribute) !== active) document.documentElement.toggleAttribute(themeAttribute, active);
  };
  const geometry = () => {
    if (!video) return;
    geometryDirty = false;
    const rect = video.getBoundingClientRect();
    if (isX) {
      const colors=[document.body,document.documentElement].map(el=>(getComputedStyle(el).backgroundColor.match(/[\d.]+/g)||[]).map(Number));
      const rgb=colors.find(c=>c.length>=3 && (c.length<4 || c[3]>0)) || [0,0,0];
      layer.style.mixBlendMode=(rgb[0]*.299+rgb[1]*.587+rgb[2]*.114)>160?'multiply':'screen';
    }
    if (isX) pictureFrame.style.clipPath = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${rect.left}px ${rect.top}px, ${rect.left}px ${rect.bottom}px, ${rect.right}px ${rect.bottom}px, ${rect.right}px ${rect.top}px, ${rect.left}px ${rect.top}px)`;
    const ratio = video.videoWidth / video.videoHeight || 16 / 9;
    let width = rect.width, height = width / ratio;
    if (height > rect.height) { height = rect.height; width = height * ratio; }
    if (width <= 0 || height <= 0) return;
    // Scale the picture, then blur the expanded layer in CSS pixels.
    const grow = Math.max(width, height) * settings.spread / 100;
    const spreadWidth = width + grow;
    const spreadHeight = height + grow;
    canvas.style.width = `${spreadWidth}px`;
    canvas.style.height = `${spreadHeight}px`;
    canvas.style.left = `${rect.left + (rect.width - spreadWidth) / 2}px`;
    canvas.style.top = `${rect.top + (rect.height - spreadHeight) / 2}px`;
    canvas.style.filter = `blur(${height * 0.0025 * settings.blur}px) brightness(${settings.brightness}%)`;
    const targetHeight = Math.max(1, Math.round(320 / ratio));
    if (canvas.height !== targetHeight) canvas.height = targetHeight;
  };
  const draw = () => {
    if (!canDraw()) { syncLayer(); return; }
    const source = video.currentSrc || video.src;
    if (source !== observedSource) { observedSource = source; failedSource = null; drawn = false; }
    if (failedSource === source) { drawn = false; syncLayer(); return; }
    try {
      if (geometryDirty) geometry();
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      drawn = true;
      syncLayer();
      showRuntime();
    } catch (error) {
      drawn = false; syncLayer();
      if (error.name === 'SecurityError' || error.name === 'NotSupportedError') {
        failedSource = source;
        setStatus('此视频暂不支持环境光');
      } else setStatus('等待视频画面…');
    }
  };
  const scheduleFrame = () => {
    if (!visible() || video.paused || video.ended || frameId !== null || rafId !== null || failedSource !== null) return;
    if (video.requestVideoFrameCallback) {
      frameOwner = video;
      frameId = video.requestVideoFrameCallback((now) => {
        frameId = null; frameOwner = null;
        if (now - lastDraw >= 1000 / HaloUI.qualities[settings.quality] - .5) { lastDraw = now; draw(); }
        scheduleFrame();
      });
    } else {
      rafId = requestAnimationFrame((now) => {
        rafId = null;
        if (now - lastDraw >= 1000 / HaloUI.qualities[settings.quality] - .5) { lastDraw = now; draw(); }
        scheduleFrame();
      });
    }
  };
  function update() {
    syncHost();
    cancelFrame(); geometryDirty = true; draw(); syncLayer(); scheduleFrame();
    showRuntime(); HaloUI.place(host,settings,video);
  }
  const events = ['loadeddata', 'loadedmetadata', 'canplay', 'playing', 'play', 'pause', 'seeked', 'ended', 'resize', 'error', 'enterpictureinpicture', 'leavepictureinpicture', 'webkitpresentationmodechanged'];
  const onEmpty = () => { drawn = false; failedSource = null; ctx.clearRect(0, 0, canvas.width, canvas.height); update(); };
  const onLoad = () => { failedSource = null; drawn = false; update(); };
  const intersection = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.target === video) { inViewport = entry.isIntersecting; update(); }
  });
  const resize = new ResizeObserver(() => update());
  const attach = (next) => {
    if (next === video) return;
    cancelFrame();
    if (video) {
      for (const event of events) video.removeEventListener(event, update);
      video.removeEventListener('emptied', onEmpty);
      video.removeEventListener('loadstart', onLoad);
      intersection.unobserve(video); resize.unobserve(video);
    }
    video = next; drawn = false; failedSource = null; observedSource = null; inViewport = true; lastDraw = -Infinity;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (video) {
      for (const event of events) video.addEventListener(event, update);
      video.addEventListener('emptied', onEmpty);
      video.addEventListener('loadstart', onLoad);
      intersection.observe(video); resize.observe(video);
    }
    update();
  };
  const discover = () => {
    if (!supported()) { attach(null); host.hidden = true; return; }
    const candidates = [...document.querySelectorAll('video')].map(candidate => {
      const rect = candidate.getBoundingClientRect();
      let rendered = true;
      for (let node = candidate; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (node.hidden || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number(style.opacity) === 0) { rendered = false; break; }
      }
      return { candidate, score: policy.rank({ rect, viewportWidth: innerWidth, viewportHeight: innerHeight,
        modal: !!candidate.closest('[role=dialog]'), visible: rendered, connected: candidate.isConnected,
        primary: !!candidate.closest(policy.playerSelector),
        playing: !candidate.paused && !candidate.ended, ready: candidate.readyState >= 2 }) };
    }).filter(item => Number.isFinite(item.score)).sort((a, b) => b.score - a.score);
    const next = candidates[0]?.candidate || null;
    if(next === video) geometryDirty = true;
    attach(next);
    // A reused media element may switch source without being replaced.
    if (video && observedSource !== (video.currentSrc || video.src)) { failedSource = null; drawn = false; update(); }
    syncHost();
  };
  HaloUI.bindDrag(shadow, { get:()=>settings, beforeMove:()=>wave.finish(), commit:anchor=>{settings={...settings,anchor};renderControls();persist();} });
  let discoverTimer;
  const observer = new MutationObserver(() => {
    if (discoverTimer) return;
    discoverTimer = setTimeout(() => { discoverTimer = null; discover(); }, 100);
  });
  let geometryFrame;
  const onScroll = () => {
    if (geometryFrame) return;
    geometryFrame = requestAnimationFrame(() => { geometryFrame = null; if(isX)discover(); geometry(); syncLayer(); HaloUI.place(host,settings,video); });
  };
  const storageListener = (changes, area) => {
    if (area !== 'local' || !changes[KEY]) return;
    // This document already rendered its edit. A delayed save must not undo newer input.
    if (changes[KEY].newValue?.__haloSource === preferenceSource) return;
    const previous = settings.enabled; settings = normalize(changes[KEY].newValue); updateControls(previous);
  };
  const runtimeState = () => {
    if(comparing)return '正在对比原画，个人设置未改变';
    if(!settings.enabled)return '已关闭，调整将在开启后生效';
    if(video?.error)return '播放器尚未提供可用画面';
    if(failedSource)return '此视频暂不支持环境光';
    if(!video || video.readyState<2)return '等待视频画面';
    if(!visible())return '已暂停渲染';
    if(!drawn)return '等待环境光渲染';
    return video.paused?'视频已暂停，保留当前光效':'环境光正在生效';
  };
  const showRuntime = () => HaloUI.runtime(shadow,runtimeState(),!!video?.error || !!failedSource);
  const localCompare = value => { comparing=value;clearTimeout(compareTimer);if(value)compareTimer=setTimeout(()=>localCompare(false),2500);update(); };
  let compareHeartbeat;
  HaloUI.bindPreferences(shadow,{get:()=>settings,
    commit:next=>{if(next.position!==settings.position || next.anchor!==settings.anchor)wave.finish();const previous=settings.enabled;settings=normalize(next);updateControls(previous);persist();},
    compare:value=>{localCompare(value);clearInterval(compareHeartbeat);if(value)compareHeartbeat=setInterval(()=>localCompare(true),1000);return true;},
    retry:()=>{failedSource=null;discover();update();},place:()=>HaloUI.place(host,settings,video),
  });
  api.runtime.onMessage.addListener((message, sender, reply) => { if(message.type==='halo-status'){reply({status:runtimeState()});return;} if(message.type==='halo-compare'){localCompare(!!message.value);reply({ok:true});return;} if (message.type === 'halo-open') { discover(); if (!supported() || !video) { reply({ok:false}); return; } setOpen(true); reply({ok:true}); } });
  const start = async () => {
    try { const saved = await api.storage.local.get(KEY); settings = normalize(saved[KEY]); } catch { /* Defaults work without persistence. */ }
    wave.setInitial(settings.enabled);
    document.body.prepend(layer);
    document.documentElement.append(host);
    renderControls();
    observer.observe(document.body, { childList: true, subtree: true });
    // Web fullscreen only changes a body class; it does not fire fullscreenchange.
    new MutationObserver(syncHost).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    api.storage.onChanged.addListener(storageListener);
    document.addEventListener('visibilitychange', update);
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('popstate', discover);
    window.addEventListener('hashchange', discover);
    // Isolated extension worlds cannot safely intercept the page's History API.
    // Poll while visible to catch pushState, CSS-only player changes and source reuse.
    startDiscovery();
    discover();
  };
  let discoveryInterval;
  const startDiscovery = () => {
    clearInterval(discoveryInterval);
    discoveryInterval = setInterval(() => { if (!document.hidden) discover(); }, 750);
  };
  window.addEventListener('pagehide', () => { cancelFrame(); clearInterval(discoveryInterval); }, { capture: true });
  window.addEventListener('pageshow', () => { if (host.isConnected) { startDiscovery(); discover(); update(); } });
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
