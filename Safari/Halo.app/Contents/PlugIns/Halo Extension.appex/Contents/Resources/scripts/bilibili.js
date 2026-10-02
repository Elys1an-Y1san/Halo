/* Bilibili adapter for the local Safari port. Original YouTube renderer is separate. */
(() => {
  'use strict';
  const api = globalThis.browser || globalThis.chrome;
  const KEY = 'ambientlight-bilibili-v1';
  const preferenceSource = crypto.randomUUID();
  const defaults = { enabled: true, blur: 60, spread: 100, brightness: 100 };
  let settings = { ...defaults };
  const clamp = (value, min, max, fallback) => Number.isFinite(Number(value))
    ? Math.max(min, Math.min(max, Number(value))) : fallback;
  const normalize = (stored) => {
    const value = stored && typeof stored === 'object' ? stored : {};
    return ({
    enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
    blur: clamp(value.blur, 0, 100, defaults.blur),
    spread: clamp(value.spread, 0, 200, defaults.spread),
    brightness: clamp(value.brightness, 20, 180, defaults.brightness),
  });
  };
  const supported = () => HaloBilibili.supports(new URL(location.href));
  if (document.getElementById('bili-ambient-ui')) return;

  const layer = document.createElement('div');
  layer.id = 'bili-ambient-layer';
  layer.hidden = true;
  layer.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 180;
  layer.append(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const host = document.createElement('div');
  host.id = 'bili-ambient-ui';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${HaloUI.css}</style>${HaloUI.markup}`;
  const $ = (id) => shadow.getElementById(id);
  HaloUI.bindUpdates(shadow, api);
  const panelMotion = HaloUI.createPanel(shadow);
  const wave = HaloWave.create({
    host, trigger: () => { panelMotion.settle(); return panelMotion.isOpen ? $('enabled') : $('toggle'); },
    layers: () => [layer], ready: () => canDraw() && drawn,
    themeAttribute: 'data-bili-ambient',
    surfaceSelector: '#app,#video-page-app,#mirror-vdcon,.bili-header__bar,.video-info-title,.video-title,.up-name,.video-page-card-small .title,.video-desc-container,.video-pod,.video-sections-content-list,.base-video-sections,.playlist-container',
  });
  const status = $('status');
  const setStatus = (text) => { if (status.textContent !== text) status.textContent = text; };
  const setOpen = open => panelMotion.setOpen(open);
  const syncHost = () => {
    const hidden = !supported() || !!document.fullscreenElement || !!document.webkitFullscreenElement ||
      document.body?.classList.contains('webscreen-fix');
    if (hidden && panelMotion.isOpen) { setOpen(false); panelMotion.settle(); }
    host.hidden = !!hidden;
  };
  $('toggle').addEventListener('click', () => setOpen(!panelMotion.isOpen));
  $('close').addEventListener('click', () => { setOpen(false); $('toggle').focus(); });
  shadow.addEventListener('keydown', (event) => { if (event.key === 'Escape') { setOpen(false); $('toggle').focus(); } });
  const renderControls = () => {
    HaloUI.sync(shadow, settings);
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
  for (const name of ['enabled', 'blur', 'spread', 'brightness']) {
    $(name).addEventListener(name === 'enabled' ? 'change' : 'input', () => {
      const previous = settings.enabled;
      settings[name] = name === 'enabled' ? $(name).checked : Number($(name).value);
      updateControls(previous); persist();
    });
  }
  shadow.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => { settings = { ...settings, ...HaloUI.presets[button.dataset.preset] }; renderControls(); update(); persist(); }));
  $('reset').addEventListener('click', () => { const previous = settings.enabled; settings = { ...defaults }; updateControls(previous); persist(); });

  let video = null;
  let frameId = null;
  let frameOwner = null;
  let rafId = null;
  let lastDraw = -Infinity;
  let failedSource = null;
  let observedSource = null;
  let inViewport = true;
  let drawn = false;
  const cancelFrame = () => {
    if (frameId !== null) frameOwner?.cancelVideoFrameCallback?.(frameId);
    if (rafId !== null) cancelAnimationFrame(rafId);
    frameId = rafId = null; frameOwner = null;
  };
  const visible = () => wave.renderingEnabled && supported() && !!video && video.isConnected &&
    !document.hidden && !document.fullscreenElement && !document.webkitFullscreenElement &&
    !video.webkitDisplayingFullscreen && !document.pictureInPictureElement &&
    video.webkitPresentationMode !== 'picture-in-picture' && inViewport;
  const canDraw = () => visible() && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
  const syncLayer = () => {
    const active = canDraw() && drawn;
    layer.hidden = !active;
    document.documentElement.toggleAttribute('data-bili-ambient', active);
  };
  const geometry = () => {
    if (!video) return;
    const rect = video.getBoundingClientRect();
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
      geometry();
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      drawn = true;
      syncLayer();
      setStatus('');
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
        if (now - lastDraw >= 1000 / 30) { lastDraw = now; draw(); }
        scheduleFrame();
      });
    } else {
      rafId = requestAnimationFrame((now) => {
        rafId = null;
        if (now - lastDraw >= 1000 / 30) { lastDraw = now; draw(); }
        scheduleFrame();
      });
    }
  };
  function update() {
    syncHost();
    cancelFrame(); geometry(); draw(); syncLayer(); scheduleFrame();
    if (!settings.enabled) setStatus('环境光已关闭');
    else if (video?.error) setStatus('播放器尚未提供可用画面');
    else if (!video || video.readyState < 2) setStatus('等待视频画面…');
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
      return { candidate, score: HaloBilibili.rank({ rect, viewportWidth: innerWidth, viewportHeight: innerHeight,
        visible: rendered, connected: candidate.isConnected,
        primary: !!candidate.closest(HaloBilibili.playerSelector),
        playing: !candidate.paused && !candidate.ended, ready: candidate.readyState >= 2 }) };
    }).filter(item => Number.isFinite(item.score)).sort((a, b) => b.score - a.score);
    const next = candidates[0]?.candidate || null;
    attach(next);
    // A reused media element may switch source without being replaced.
    if (video && observedSource !== (video.currentSrc || video.src)) { failedSource = null; drawn = false; update(); }
    syncHost();
  };
  let discoverTimer;
  const observer = new MutationObserver(() => {
    if (discoverTimer) return;
    discoverTimer = setTimeout(() => { discoverTimer = null; discover(); }, 100);
  });
  let geometryFrame;
  const onScroll = () => {
    if (geometryFrame) return;
    geometryFrame = requestAnimationFrame(() => { geometryFrame = null; geometry(); syncLayer(); });
  };
  const storageListener = (changes, area) => {
    if (area !== 'local' || !changes[KEY]) return;
    // This document already rendered its edit. A delayed save must not undo newer input.
    if (changes[KEY].newValue?.__haloSource === preferenceSource) return;
    const previous = settings.enabled; settings = normalize(changes[KEY].newValue); updateControls(previous);
  };
  api.runtime.onMessage.addListener((message, sender, reply) => { if (message.type === 'halo-open') { discover(); if (!supported() || !video) { reply({ok:false}); return; } setOpen(true); reply({ok:true}); } });
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
