/* Live page reveal: one radius drives both the optical wave and actual renderer clipping. */
(() => {
  'use strict';
  const paintProperties = ['background-color', 'background-image', 'background-clip', '-webkit-background-clip', '-webkit-text-fill-color', 'color', 'transition'];
  const readPaint = element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, image: style.backgroundImage, color: style.color };
  };
  const inlinePaint = element => Object.fromEntries(paintProperties.map(name => [name, {
    value: element.style.getPropertyValue(name), priority: element.style.getPropertyPriority(name),
  }]));
  const restore = (element, properties) => {
    for (const [name, { value, priority }] of Object.entries(properties)) {
      if (value) element.style.setProperty(name, value, priority);
      else element.style.removeProperty(name);
    }
  };
  const sameProperty = (a,b) => a.value === b.value && a.priority === b.priority;
  const property = (element,name) => ({value:element.style.getPropertyValue(name),priority:element.style.getPropertyPriority(name)});
  const writePaint = (record,name,value) => {
    const current=property(record.element,name), previous=record.written[name];
    if (previous && sameProperty(current,previous) && previous.raw === value) return;
    if (!previous || !sameProperty(current,previous)) record.inline[name]=current;
    record.element.style.setProperty(name,value,'important');
    record.written[name]={...property(record.element,name),raw:value};
  };
  const restorePaint = record => {
    for (const [name,last] of Object.entries(record.written)) {
      // A site update during the wave owns its newer inline value.
      if (sameProperty(property(record.element,name),last)) restore(record.element,{[name]:record.inline[name]});
    }
    record.written={};
  };
  const mix = (old, next, amount) => amount <= 0 ? old : amount >= 1 ? next : `color-mix(in srgb, ${old}, ${next} ${amount * 100}%)`;
  const viewport = () => ({width:document.documentElement.clientWidth || innerWidth,height:document.documentElement.clientHeight || innerHeight});
  const ease = value => 1 - Math.pow(1 - value, 3);
  const visibleRect = element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth ? rect : null;
  };
  let optics;
  function getOptics() {
    if(optics)return optics;
    const front=document.createElement('canvas');front.width=front.height=512;
    const ctx=front.getContext('2d'),x=256,y=256;
    const band=ctx.createRadialGradient(x,y,140,x,y,256);
    band.addColorStop(0,'rgba(243,199,128,0)');
    band.addColorStop(.38,'rgba(243,199,128,.025)');
    band.addColorStop(.66,'rgba(255,214,157,.15)');
    band.addColorStop(.82,'rgba(145,197,219,.07)');
    band.addColorStop(1,'rgba(145,197,219,0)');
    ctx.fillStyle=band;ctx.fillRect(0,0,512,512);
    for(let i=0;i<9;i++){
      const a=i*2.3999632297,px=x+Math.cos(a)*205,py=y+Math.sin(a)*205;
      const glow=ctx.createRadialGradient(px,py,0,px,py,45);
      glow.addColorStop(0,i%3?'rgba(255,224,176,.11)':'rgba(153,211,229,.08)');glow.addColorStop(1,'transparent');
      ctx.fillStyle=glow;ctx.fillRect(px-45,py-45,90,90);
    }
    const launch=document.createElement('canvas');launch.width=launch.height=192;
    const lc=launch.getContext('2d'),flare=lc.createRadialGradient(96,96,0,96,96,96);
    flare.addColorStop(0,'rgba(255,234,195,.3)');flare.addColorStop(.3,'rgba(243,199,128,.1)');flare.addColorStop(1,'transparent');
    lc.fillStyle=flare;lc.fillRect(0,0,192,192);
    optics={front,launch};return optics;
  }
  globalThis.HaloWave = {
    create({ host, trigger, layers, ready, themeAttribute, surfaceSelector, animateSurfaces = true }) {
      let enabled = true, active = null, frame = 0, pendingCleanup = null;
      let media = matchMedia('(prefers-reduced-motion: reduce)');
      let baselineDark = document.documentElement.hasAttribute('dark');
      const controller = {
        get renderingEnabled() { return active ? true : enabled; },
        get running() { return !!active; },
        setInitial(value) { if (!active) enabled = value; },
        finish() {
          if (!active) return;
          const state = active;
          active = null;
          cancelAnimationFrame(frame); frame = 0;
          enabled = state.target;
          // A bridged renderer can acknowledge disable asynchronously. Keep its zero mask
          // and the final off material until that acknowledgement, avoiding a full-page flash.
          let observer, timeout;
          const release = () => {
            observer?.disconnect(); clearTimeout(timeout);
            for (const record of state.surfaces) restorePaint(record);
            for (const record of state.layers) restore(record.element, record.original);
            if (pendingCleanup === release) pendingCleanup = null;
          };
          try { state.commit(); } finally {
            state.overlay.remove(); state.guard.remove();
            document.documentElement.removeAttribute('data-halo-wave');
            if (!state.target && document.documentElement.hasAttribute(themeAttribute)) {
              for (const record of state.layers) record.element.style.setProperty('clip-path','circle(0px at 0px 0px)','important');
              pendingCleanup = release;
              observer = new MutationObserver(() => { if (!document.documentElement.hasAttribute(themeAttribute)) release(); });
              observer.observe(document.documentElement,{attributes:true,attributeFilter:[themeAttribute]});
              timeout = setTimeout(release,800);
            } else release();
          }
        },
        toggle(target, commit) {
          pendingCleanup?.();
          if (active) {
            // A rapid reversal can arrive during a newly opened panel entry.
            trigger();
            if (active.target === target) return;
            if (!active.started) { active.target = target; active.commit = commit; controller.finish(); return; }
            active.target = target; active.commit = commit;
            active.from = active.radius; active.to = target ? active.reach : 0;
            active.started = performance.now();
            active.duration = Math.max(140, (target ? 900 : 650) * Math.abs(active.to - active.from) / active.reach);
            active.overlay.dataset.target = String(target);
            // Retarget the existing radius and rendering; never layer another animation on top.
            commit(); return;
          }
          if (target === enabled || (!target && !ready()) || media.matches || document.hidden || document.fullscreenElement || document.webkitFullscreenElement || !CSS.supports('clip-path', 'circle(1px at 1px 1px)')) {
            enabled = target; commit(); return;
          }
          const originRect = visibleRect(trigger()) || visibleRect(host);
          if (!originRect) { enabled = target; commit(); return; }
          const size = viewport();
          const origin = { x: Math.min(size.width, Math.max(0, originRect.left + originRect.width / 2)), y: Math.min(size.height, Math.max(0, originRect.top + originRect.height / 2)) };
          const reach = Math.max(...[[0,0],[size.width,0],[0,size.height],[size.width,size.height]].map(([x,y]) => Math.hypot(x-origin.x,y-origin.y))) + 260;
          // Prioritize visible site surfaces. Bound capture before reading computed styles;
          // a long comment thread must not add work to every frame of a toggle.
          const elements = new Set(animateSurfaces ? [document.documentElement, document.body, ...document.querySelectorAll(surfaceSelector)] : []);
          const surfaces = [];
          const capture = element => {
            if (!element || element === host || element.closest('#halo-page-wave') || surfaces.length >= 72) return;
            const rect = visibleRect(element);
            if (!rect) return;
            const before = readPaint(element);
            const textOnly = !element.childElementCount && !!element.textContent.trim() && before.image === 'none' && /^(transparent|rgba\(0, 0, 0, 0\))$/.test(before.background);
            surfaces.push({ element, rect, inline: inlinePaint(element), written: {}, before, textOnly, directText: [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()) });
          };
          for (const element of elements) { capture(element); if (surfaces.length >= 72) break; }
          let scanned = 0;
          for (const element of animateSurfaces ? document.querySelectorAll('h1,h2,h3,h4,p,a,span,yt-formatted-string') : []) {
            if (surfaces.length >= 72 || ++scanned > 240) break;
            if (!elements.has(element) && !element.childElementCount && element.textContent.trim()) capture(element);
          }
          if (target && !document.documentElement.hasAttribute(themeAttribute)) baselineDark = document.documentElement.hasAttribute('dark');
          // Sample the off material without pausing or replacing the live video.
          if (!target) {
            const html = document.documentElement;
            const attribute = html.getAttribute(themeAttribute), dark = html.getAttribute('dark');
            html.removeAttribute(themeAttribute);
            if (!baselineDark) html.removeAttribute('dark');
            for (const record of surfaces) record.off = readPaint(record.element);
            if (attribute !== null) html.setAttribute(themeAttribute, attribute);
            if (dark !== null) html.setAttribute('dark', dark);
            for (const record of surfaces) record.on = record.before;
          } else {
            for (const record of surfaces) record.off = record.before;
          }
          const overlay = document.createElement('div');
          overlay.id = 'halo-page-wave';
          overlay.setAttribute('aria-hidden', 'true');
          overlay.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483645;pointer-events:none;overflow:hidden;contain:strict';
          const shadow = overlay.attachShadow({ mode: 'closed' });
          const canvas = document.createElement('canvas');
          canvas.style.cssText = 'position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none';
          const dpr = Math.min(devicePixelRatio || 1, .75, Math.sqrt(800000 / (size.width * size.height)));
          canvas.width = Math.ceil(size.width * dpr); canvas.height = Math.ceil(size.height * dpr);
          const context = canvas.getContext('2d');
          if (!context) { enabled = target; commit(); return; }
          context.scale(dpr, dpr);
          const optics = getOptics();
          shadow.append(canvas);
          const guard = document.createElement('style');
          guard.textContent = 'html[data-halo-wave="waiting"] :is(#bili-ambient-layer,#halo-x-layer,.ambientlight__container){clip-path:circle(0px at 0px 0px)!important}';
          document.documentElement.append(guard, overlay);
          overlay.dataset.originX = String(origin.x); overlay.dataset.originY = String(origin.y); overlay.dataset.target = String(target);
          active = { target, commit, origin, reach, size, canvas, dpr, optics, surfaces, layers: [], overlay, guard, context, lastPaint: -Infinity, radius: target ? 0 : reach, from: target ? 0 : reach, to: target ? reach : 0, started: 0, queued: performance.now(), duration: target ? 900 : 650 };
          document.documentElement.setAttribute('data-halo-wave', target ? 'waiting' : 'running');
          // Freeze only pre-change material styles; video and renderer continue updating.
          for (const record of surfaces) {
            writePaint(record,'transition','none');
            writePaint(record,'background-color',record.before.background);
            writePaint(record,'color',record.before.color);
          }
          commit();
          const captureLayers = state => {
            state.layers = [...layers()].map(element => ({ element, rect: element.getBoundingClientRect(), original: Object.fromEntries(['clip-path','mask-image','-webkit-mask-image'].map(name=>[name,{value:element.style.getPropertyValue(name),priority:element.style.getPropertyPriority(name)}])) }));
          };
          const refreshGeometry = state => {
            const nextSize=viewport(), rect=visibleRect(trigger()) || visibleRect(host);
            if (!rect) return;
            const oldReach=state.reach;
            state.size=nextSize;
            state.origin={x:Math.min(nextSize.width,Math.max(0,rect.left+rect.width/2)),y:Math.min(nextSize.height,Math.max(0,rect.top+rect.height/2))};
            state.reach=Math.max(...[[0,0],[nextSize.width,0],[0,nextSize.height],[nextSize.width,nextSize.height]].map(([x,y])=>Math.hypot(x-state.origin.x,y-state.origin.y)))+260;
            state.from=state.from/oldReach*state.reach;state.to=state.target?state.reach:0;state.radius=state.radius/oldReach*state.reach;
            for (const record of state.surfaces) {
              record.rect=record.element.getBoundingClientRect();
              const {left,right,top,bottom}=record.rect, {x,y}=state.origin;
              const l=Math.max(0,left),r=Math.min(state.size.width,right),t=Math.max(0,top),b=Math.min(state.size.height,bottom);
              record.near=Math.hypot(Math.max(l-x,0,x-r),Math.max(t-y,0,y-b));
              record.far=Math.max(...[[l,t],[r,t],[l,b],[r,b]].map(([px,py])=>Math.hypot(px-x,py-y)));
              record.phase=null;
            }
            for (const record of state.layers) record.rect=record.element.getBoundingClientRect();
            const width=Math.ceil(nextSize.width*state.dpr),height=Math.ceil(nextSize.height*state.dpr);
            if(state.canvas.width!==width || state.canvas.height!==height){state.canvas.width=width;state.canvas.height=height;state.context.scale(state.dpr,state.dpr);}
            state.overlay.dataset.originX=String(state.origin.x);state.overlay.dataset.originY=String(state.origin.y);
          };
          const paint = state => {
            const radius = Math.max(0, state.radius);
            // This is the actual live ambient renderer, not a decorative substitute.
            for (const record of state.layers) {
              const x = state.origin.x - record.rect.left, y = state.origin.y - record.rect.top;
              record.element.style.setProperty('clip-path', `circle(${(radius+150).toFixed(2)}px at ${x.toFixed(2)}px ${y.toFixed(2)}px)`, 'important');
              const mask=`radial-gradient(circle at ${x}px ${y}px, rgba(0,0,0,${Math.min(1,radius/150)}) ${Math.max(0,radius-150)}px, transparent ${radius+150}px)`;
              record.element.style.setProperty('mask-image',mask,'important');
              record.element.style.setProperty('-webkit-mask-image',mask,'important');
            }
            for (const record of state.surfaces) {
              const { element, rect, off, on, textOnly } = record;
              if (!element.isConnected) continue;
              const phase = radius > record.far + 150 ? 'on' : radius < record.near - 150 ? 'off' : 'front';
              if (phase !== 'front' && phase === record.phase) continue;
              record.phase = phase;
              const x = state.origin.x - rect.left, y = state.origin.y - rect.top;
              if (off.image === 'none' && on.image === 'none' && off.background !== on.background) {
                writePaint(record,'background-color','transparent');
                writePaint(record,'background-image',`radial-gradient(circle at ${x}px ${y}px, ${on.background} ${Math.max(0, radius-110)}px, ${off.background} ${radius+110}px)`);
              }
              if (off.color !== on.color) {
                if (textOnly) {
                  writePaint(record,'background-image',`radial-gradient(circle at ${x}px ${y}px, ${on.color} ${Math.max(0,radius-80)}px, ${off.color} ${radius+80}px)`);
                  writePaint(record,'background-clip','text');
                  writePaint(record,'-webkit-background-clip','text');
                  writePaint(record,'-webkit-text-fill-color','transparent');
                } else {
                  // Containers keep their inherited baseline; leaf glyphs carry the spatial reveal.
                  const directText = record.directText;
                  const distance = Math.hypot(rect.left+rect.width/2-state.origin.x,rect.top+rect.height/2-state.origin.y);
                  writePaint(record,'color',directText ? mix(off.color,on.color,Math.max(0,Math.min(1,(radius-distance+80)/160))) : off.color);
                }
              }
            }
            drawWave(state);
            state.overlay.dataset.radius = String(Math.round(radius));
          };
          const tick = now => {
            const state = active;
            if (!state) return;
            if (!state.started) {
              if (!ready()) {
                if (now-state.queued > 1400) { controller.finish(); return; }
                frame=requestAnimationFrame(tick); return;
              }
              // Unlock, sample the applied material, and relock in this same frame.
              for (const record of state.surfaces) restorePaint(record);
              if (state.target) for (const record of state.surfaces) record.on = readPaint(record.element);
              for (const record of state.surfaces) writePaint(record,'transition','none');
              captureLayers(state); refreshGeometry(state); state.started=now;
              document.documentElement.setAttribute('data-halo-wave','running');
            }
            // High-refresh displays need not rasterize this broad light field at 240 Hz.
            // The radius is still time-based, so skipped paints never extend the transition.
            if(now-state.lastPaint < 1000/60-.5 && now-state.started < state.duration){frame=requestAnimationFrame(tick);return;}
            state.lastPaint=now;
            const currentSize=viewport();
            if(currentSize.width!==state.size.width || currentSize.height!==state.size.height) refreshGeometry(state);
            const progress=Math.min(1,(now-state.started)/state.duration);
            state.radius=state.from+(state.to-state.from)*ease(progress);
            try { paint(state); } catch { controller.finish(); return; }
            if (progress>=1) { controller.finish(); return; }
            frame=requestAnimationFrame(tick);
          };
          frame=requestAnimationFrame(tick);
        },
      };
      // Rasterize the soft diffusion once; frames only scale and composite two images.
      // Keep the live video renderer separate so playback never becomes a snapshot.
      function drawWave(state) {
        const ctx=state.context, {x,y}=state.origin, r=state.radius;
        ctx.clearRect(0,0,state.size.width,state.size.height);
        if(r<1)return;
        const envelope=Math.min(1,r/80,(state.reach-r)/140);
        const size=r+110;
        ctx.globalAlpha=envelope;
        ctx.drawImage(state.optics.front,x-size,y-size,size*2,size*2);
        const launch=Math.max(0,1-r/state.reach*4);
        if(launch>0){ctx.globalAlpha=launch;ctx.drawImage(state.optics.launch,x-96,y-96,192,192);}
        ctx.globalAlpha=1;
      }
      const settle = () => controller.finish();
      for (const event of ['resize','scroll','pagehide']) window.addEventListener(event,settle,{passive:true});
      for (const event of ['visibilitychange','fullscreenchange','webkitfullscreenchange']) document.addEventListener(event,settle);
      media.addEventListener('change',settle);
      return controller;
    },
  };
})();
