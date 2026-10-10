/* Shared video adapter. Site policies own route and player selection. */
(() => {
  'use strict';
  const api = globalThis.browser || globalThis.chrome;
  const policy = globalThis.HaloYouTube || globalThis.HaloX || HaloBilibili;
  const isYouTube = !!globalThis.HaloYouTube;
  const isX = !!globalThis.HaloX;
  const KEY = isYouTube ? 'halo-youtube-v1' : isX ? 'halo-x-v1' : 'ambientlight-bilibili-v1';
  const hostId = isYouTube ? 'halo-youtube-ui' : isX ? 'halo-x-ui' : 'bili-ambient-ui';
  const layerId = isYouTube ? 'halo-youtube-layer' : isX ? 'halo-x-layer' : 'bili-ambient-layer';
  const themeAttribute = isYouTube ? 'data-halo-youtube' : isX ? 'data-halo-x' : 'data-bili-ambient';
  const preferenceSource = crypto.randomUUID();
  const defaults = HaloUI.normalize();
  let settings = { ...defaults }, comparing = false, compareTimer, preferenceRevision = 0;
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
  let ctx;
  const acquireContext = () => { try { ctx = canvas.getContext('2d', { alpha: false }); } catch { ctx = null; } };
  acquireContext();
  const light = HaloVideo.createLightProcessor();
  const adaptive = HaloVideo.createAdaptiveQuality();
  let activeQuality = settings.quality, callbackLag = 0;
  const samplingRate = () => settings.quality === 'auto' ? adaptive.fps : HaloUI.qualities[settings.quality];

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
    host, trigger: () => { panelMotion.settle(); return panelMotion.isOpen ? $('panel') : $('toggle'); },
    layers: () => [layer], ready: () => canDraw() && drawn,
    themeAttribute, animateSurfaces: !isX,
    surfaceSelector: isYouTube ? 'ytd-app,ytd-masthead,#background.ytd-masthead,#description,#secondary,ytd-watch-metadata,yt-formatted-string,ytd-comments,ytd-playlist-panel-renderer,ytd-engagement-panel-section-list-renderer,yt-chip-cloud-renderer' : isX ? '#halo-x-layer' : '#app,#video-page-app,#mirror-vdcon,.bili-header__bar,.video-info-title,.video-title,.up-name,.video-page-card-small .title,.video-desc-container,.video-pod,.video-sections-content-list,.base-video-sections,.playlist-container',
  });
  const status = $('status');
  const setStatus = (text) => { if (status.textContent !== text) status.textContent = text; };
  const setOpen = open => { if(open)onboarding?.dismiss(); panelMotion.setOpen(open); HaloUI.place(host,settings,video); };
  let onboarding;
  const syncHost = () => {
    if (document.hidden || suspended) return;
    const hidden = ((isX || isYouTube) && !video) || !supported() || !!document.fullscreenElement || !!document.webkitFullscreenElement ||
      document.body?.classList.contains('webscreen-fix');
    if (hidden && panelMotion.isOpen) { setOpen(false); panelMotion.settle(); }
    if (host.hidden !== !!hidden) host.hidden = !!hidden;
    onboarding?.sync();
  };
  $('toggle').addEventListener('click', () => { onboarding?.dismiss(); setOpen(!panelMotion.isOpen); });
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
  let frameId = null, frameGeneration = 0;
  let frameOwner = null;
  let rafId = null;
  let lastDraw = -Infinity;
  let failedSource = null, renderError = false, drawFailures = 0;
  let observedSource = null;
  let inViewport = true, suspended = false;
  let drawn = false, geometryDirty = true;
  const cancelFrame = () => {
    ++frameGeneration;
    if (frameId !== null) frameOwner?.cancelVideoFrameCallback?.(frameId);
    if (rafId !== null) cancelAnimationFrame(rafId);
    frameId = rafId = null; frameOwner = null;
  };
  const visible = () => !suspended && !comparing && wave.renderingEnabled && supported() && !!video && video.isConnected &&
    !policy.isMini?.(video) &&
    !document.hidden && !document.fullscreenElement && !document.webkitFullscreenElement &&
    !video.webkitDisplayingFullscreen && !document.pictureInPictureElement &&
    video.webkitPresentationMode !== 'picture-in-picture' && inViewport;
  const canDraw = () => !!ctx && visible() && !video.error && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
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
    const geometry = HaloVideo.geometry(rect, video.videoWidth, video.videoHeight, settings);
    if (!geometry) return;
    for (const [property, value] of Object.entries(geometry.style)) {
      if (canvas.style[property] !== value) canvas.style[property] = value;
    }
    if (canvas.height !== geometry.height) { canvas.height = geometry.height; return true; }
    return false;
  };
  const draw = () => {
    if (!canDraw()) { syncLayer(); return; }
    const source = video.srcObject || video.currentSrc || video.src;
    if (source !== observedSource) { observedSource = source; failedSource = null; renderError = false; drawFailures = 0; drawn = false; light.reset(); adaptive.reset(); }
    if (failedSource === source) { drawn = false; syncLayer(); return; }
    try {
      const started = performance.now();
      const resized = geometryDirty && geometry();
      light.draw(ctx, video, started, settings.brightness, !drawn || resized || video.paused || video.seeking);
      if (settings.quality === 'auto' && !video.paused) adaptive.observe(started, performance.now() - started, callbackLag);
      callbackLag = 0;
      renderError = false; drawFailures = 0;
      drawn = true;
      syncLayer();
      showRuntime();
    } catch (error) {
      renderError = true;
      drawn = false; syncLayer();
      if (++drawFailures >= 3 || error.name === 'SecurityError' || error.name === 'NotSupportedError') {
        failedSource = source;
        setStatus('暂时无法读取视频画面，请重试');
      } else setStatus('等待视频画面…');
      showRuntime();
    }
  };
  const scheduleFrame = () => {
    if (!visible() || video.paused || video.ended || frameId !== null || rafId !== null || failedSource !== null) return;
    const generation = frameGeneration;
    if (video.requestVideoFrameCallback) {
      frameOwner = video;
      frameId = video.requestVideoFrameCallback((now, metadata) => {
        if (generation !== frameGeneration) return;
        frameId = null; frameOwner = null;
        callbackLag = Math.max(0, now - (metadata?.expectedDisplayTime ?? now));
        if (now - lastDraw >= 1000 / samplingRate() - .5) { lastDraw = now; draw(); }
        scheduleFrame();
      });
    } else {
      const requested = performance.now();
      rafId = requestAnimationFrame((now) => {
        if (generation !== frameGeneration) return;
        rafId = null;
        callbackLag = Math.max(0, now - requested - 1000 / 60);
        if (now - lastDraw >= 1000 / samplingRate() - .5) { lastDraw = now; draw(); }
        scheduleFrame();
      });
    }
  };
  function update() {
    onboarding?.sync();
    if (activeQuality !== settings.quality) { activeQuality = settings.quality; adaptive.reset(); }
    if (document.hidden || suspended) { cancelFrame(); syncLayer(); showRuntime(); return; }
    syncHost();
    cancelFrame(); geometryDirty = true; draw(); syncLayer(); scheduleFrame();
    showRuntime(); HaloUI.place(host,settings,video);
  }
  const events = ['loadeddata', 'loadedmetadata', 'canplay', 'playing', 'play', 'pause', 'ended', 'resize', 'error', 'enterpictureinpicture', 'leavepictureinpicture', 'webkitpresentationmodechanged'];
  const onSeek = () => { light.reset(); drawn = false; update(); };
  const onEmpty = () => { light.reset(); drawn = false; failedSource = null; ctx?.clearRect(0, 0, canvas.width, canvas.height); update(); };
  const onLoad = () => { light.reset(); adaptive.reset(); failedSource = null; renderError = false; drawFailures = 0; drawn = false; update(); };
  const intersection = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.target === video) { inViewport = entry.isIntersecting; update(); }
  });
  const resize = new ResizeObserver(() => update());
  const attach = (next) => {
    if (next === video) return;
    cancelFrame();
    if (video) {
      for (const event of events) video.removeEventListener(event, update);
      video.removeEventListener('seeked', onSeek);
      video.removeEventListener('emptied', onEmpty);
      video.removeEventListener('loadstart', onLoad);
      intersection.unobserve(video); resize.unobserve(video);
    }
    light.reset(); adaptive.reset(); callbackLag = 0;
    video = next; renderError = false; drawFailures = 0; drawn = false; failedSource = null; observedSource = null; inViewport = true; lastDraw = -Infinity;
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    if (video) {
      for (const event of events) video.addEventListener(event, update);
      video.addEventListener('seeked', onSeek);
      video.addEventListener('emptied', onEmpty);
      video.addEventListener('loadstart', onLoad);
      intersection.observe(video); resize.observe(video);
    }
    update();
  };
  let candidatesDirty = true, videoCandidates = [];
  let modeTargets = [];
  const observePlayerMode = () => {
    if (!playerModeObserver) return;
    const targets = [], visited = new Set();
    for (const candidate of videoCandidates) {
      for (let node = candidate.parentElement; node && !visited.has(node); node = node.parentElement) {
        visited.add(node);
        if (node.matches(policy.modeSelector || '.bpx-player-container')) targets.push(node);
      }
    }
    if (targets.length === modeTargets.length && targets.every((node, index) => node === modeTargets[index])) return;
    playerModeObserver.disconnect(); modeTargets = targets;
    for (const target of targets) playerModeObserver.observe(target, { attributes: true, attributeFilter: policy.modeAttributes || ['data-screen'] });
  };
  const discover = () => {
    if (document.hidden || suspended) return;
    if (!supported()) { attach(null); host.hidden = true; return; }
    if (candidatesDirty) { videoCandidates = [...document.querySelectorAll('video')]; candidatesDirty = false; }
    // Shared ancestors are read once per discovery, never cached across passes.
    // This still detects CSS-only visibility changes without repeated style reads.
    const visibility = new Map();
    const rendered = node => {
      if (!node) return true;
      if (visibility.has(node)) return visibility.get(node);
      const style = getComputedStyle(node);
      const result = !node.hidden && style.display !== 'none' && style.visibility !== 'hidden' &&
        style.visibility !== 'collapse' && Number(style.opacity) !== 0 && rendered(node.parentElement);
      visibility.set(node, result);
      return result;
    };
    let next = null, bestScore = -Infinity;
    for (const candidate of videoCandidates) {
      const rect = candidate.getBoundingClientRect();
      if (!candidate.isConnected || rect.width < 32 || rect.height < 18) continue;
      if (isX && (rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth)) continue;
      const score = policy.rank({ rect, viewportWidth: innerWidth, viewportHeight: innerHeight,
        mini: !!policy.isMini?.(candidate),
        modal: !!candidate.closest('[role=dialog]'), visible: rendered(candidate), connected: true,
        primary: !!candidate.closest(policy.playerSelector),
        playing: !candidate.paused && !candidate.ended, ready: candidate.readyState >= 2 });
      if (Number.isFinite(score) && score > bestScore) { next = candidate; bestScore = score; }
    }
    if(next === video) geometryDirty = true;
    attach(next);
    observePlayerMode();
    // A reused media element may switch source without being replaced.
    if (video && observedSource !== (video.srcObject || video.currentSrc || video.src)) { failedSource = null; renderError = false; drawFailures = 0; drawn = false; update(); }
    // A paused frame needs geometry updates, but no new sampling unless resizing
    // the backing canvas cleared its pixels.
    if (video?.paused && drawn && geometryDirty && geometry()) draw();
    syncHost();
  };
  HaloUI.bindDrag(shadow, { get:()=>settings, beforeMove:()=>wave.finish(), commit:anchor=>{++preferenceRevision;settings={...settings,anchor};renderControls();persist();} });
  let discoverTimer;
  const requestDiscovery = () => {
    if (discoverTimer || document.hidden || suspended) return;
    discoverTimer = setTimeout(() => { discoverTimer = null; discover(); }, 100);
  };
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (host.contains(record.target) || layer.contains(record.target)) continue;
      geometryDirty = true;
      if ([...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 &&
        (node.matches('video') || node.querySelector('video')))) candidatesDirty = true;
    }
    if (candidatesDirty) requestDiscovery();
  });
  // Bilibili reuses the video when scrolling into its mini player. Observe the
  // mode directly, before paint, instead of waiting for discovery's debounce.
  const playerModeObserver = isX ? null : new MutationObserver(records => {
    if (document.hidden || suspended) return;
    if (!records.some(record => record.target.matches(policy.modeSelector || '.bpx-player-container'))) return;
    if (policy.isMini(video)) {
      cancelFrame(); drawn = false; syncLayer(); wave.finish();
    }
    discover();
  });
  let geometryFrame;
  const onScroll = () => {
    if (geometryFrame || document.hidden || suspended) return;
    if (isX || isYouTube) requestDiscovery();
    geometryFrame = requestAnimationFrame(() => { geometryFrame = null; if (geometry() && video?.paused) draw(); syncLayer(); HaloUI.place(host,settings,video); });
  };
  const storageListener = (changes, area) => {
    if (area !== 'local' || !changes[KEY]) return;
    // This document already rendered its edit. A delayed save must not undo newer input.
    if (changes[KEY].newValue?.__haloSource === preferenceSource) return;
    ++preferenceRevision;const previous = settings.enabled; settings = normalize(changes[KEY].newValue); updateControls(previous);
  };
  const runtimeState = () => {
    if(comparing)return '正在查看原画，设置未改变';
    if(!settings.enabled)return '已关闭，调整将在开启后生效';
    if(!ctx)return '浏览器暂时无法创建光效画布，请重试';
    if(video?.error)return '播放器尚未提供可用画面';
    if(failedSource !== null)return '暂时无法读取视频画面，请重试';
    if(!isX && !isYouTube && !video && document.querySelector('.bpx-player-container[data-screen="mini"] video'))return '小窗播放中，返回主播放器后恢复环境光';
    if(!supported())return '当前页面不支持环境光，请打开视频播放页';
    if(!video)return '等待视频画面，请开始播放';
    if(video.readyState<2)return '等待视频画面加载';
    if(!visible())return '已暂停渲染';
    if(renderError)return '画面采样暂不可用，请重试';
    if(!drawn)return '等待环境光渲染';
    if(video.paused)return '视频已暂停，保留当前光效';
    if(light.limited)return '环境光正在生效；此视频不支持亮度自适应';
    return settings.quality==='auto'?`环境光正在生效 · 自动 ${adaptive.fps} 帧/秒`:'环境光正在生效';
  };
  const canRetry = () => !ctx || !!video?.error || failedSource !== null || renderError || (supported() && !video);
  const retryRendering = () => { acquireContext(); light.reset(); adaptive.reset(); drawn=false; failedSource=null; renderError=false; drawFailures=0; candidatesDirty=true; discover(); update(); };
  let lastRuntime, lastRetry;
  const showRuntime = () => {
    const text = runtimeState(), retry = canRetry();
    if (text === lastRuntime && retry === lastRetry) return;
    lastRuntime = text; lastRetry = retry;
    HaloUI.runtime(shadow, text, retry);
  };
  const localCompare = value => { comparing=value;clearTimeout(compareTimer);if(value)compareTimer=setTimeout(()=>localCompare(false),2500);update(); };
  onboarding=globalThis.HaloOnboarding?.create({api,shadow,host,
    ready:()=>!host.hidden && !document.hidden && !suspended && !!video && video.readyState>=2 && (!settings.enabled || (drawn && !layer.hidden)) && inViewport && !policy.isMini?.(video) && !document.pictureInPictureElement && video.webkitPresentationMode!=='picture-in-picture' && (!panelMotion.isOpen || onboarding?.controlsActive),
    compare:(value,animate)=>{
      canvas.style.transition=animate?'opacity 250ms cubic-bezier(.2,0,0,1)':'none';
      canvas.style.opacity=value?'0':'';
    },enabled:()=>settings.enabled,
    open:(guided=false)=>{if(guided){panelMotion.setOpen(true);HaloUI.place(host,settings,video);}else setOpen(true);$('tab-light').click();},
    enable:()=>{if(!settings.enabled)$('enabled').click();},
  });
  let compareHeartbeat;
  HaloUI.bindPreferences(shadow,{get:()=>settings,
    commit:next=>{++preferenceRevision;if(next.position!==settings.position || next.anchor!==settings.anchor)wave.finish();const previous=settings.enabled;settings=normalize(next);updateControls(previous);persist();},
    compare:value=>{localCompare(value);clearInterval(compareHeartbeat);if(value)compareHeartbeat=setInterval(()=>localCompare(true),1000);return true;},
    retry:retryRendering,place:()=>HaloUI.place(host,settings,video),
  });
  api.runtime.onMessage.addListener((message, sender, reply) => { if(sender.id && sender.id !== api.runtime.id)return; if(message?.type==='halo-start-guide'){setOpen(false);onboarding?.replay();reply({ok:!!onboarding});return;} if(message?.type==='halo-retry'){retryRendering();reply({ok:true});return;} if(message.type==='halo-status'){reply({status:runtimeState(),retry:canRetry()});return;} if(message.type==='halo-compare'){localCompare(!!message.value);reply({ok:true});return;} if (message.type === 'halo-open') { discover(); if (!supported() || !video) { reply({ok:false}); return; } setOpen(true); reply({ok:true}); } });
  const start = async () => {
    const revision = preferenceRevision;
    try { const saved = await api.storage.local.get(KEY); if(revision === preferenceRevision)settings = normalize(saved[KEY]); } catch { /* Defaults work without persistence. */ }
    if (!document.body || !host.isConnected) return;
    await onboarding?.init();
    wave.setInitial(settings.enabled);
    document.body.prepend(layer);
    document.documentElement.append(host);
    renderControls();
    observer.observe(document.body, { childList: true, subtree: true });
    // Web fullscreen only changes a body class; it does not fire fullscreenchange.
    new MutationObserver(syncHost).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    api.storage.onChanged.addListener(storageListener);
    document.addEventListener('visibilitychange', () => {
      stopDiscovery();
      if (!document.hidden) { startDiscovery(); discover(); }
      update();
    });
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    document.addEventListener('yt-navigate-finish', () => { discover(); update(); });
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
  const stopDiscovery = () => {
    clearInterval(discoveryInterval); discoveryInterval = null;
    clearTimeout(discoverTimer); discoverTimer = null;
    cancelAnimationFrame(geometryFrame); geometryFrame = null;
  };
  const startDiscovery = () => {
    clearInterval(discoveryInterval);
    if (document.hidden || suspended) return;
    discoveryInterval = setInterval(discover, 750);
  };
  window.addEventListener('pagehide', () => { suspended = true; onboarding?.suspend(); cancelFrame(); stopDiscovery(); clearInterval(compareHeartbeat); wave.finish(); syncLayer(); }, { capture: true });
  window.addEventListener('pageshow', () => { if (host.isConnected) { suspended = false; startDiscovery(); discover(); update(); } });
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
