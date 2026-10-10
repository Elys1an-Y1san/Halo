/* Live page reveal: a rounded panel outline drives both the optical front and live renderer clipping. */
(() => {
  'use strict';
  const paintProperties = ['background-color', 'background-image', 'background-clip', 'background-size', 'background-position', 'background-repeat', '-webkit-background-clip', '-webkit-text-fill-color', 'color', 'transition'];
  const readPaint = element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, image: style.backgroundImage, color: style.color, size:style.backgroundSize, position:style.backgroundPosition, repeat:style.backgroundRepeat };
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
  // Critically damped motion retains velocity on reversal instead of restarting
  // a high-speed ease-out at every click. Units are pixels and seconds.
  const advance = (value,velocity,target,dt,omega) => {
    const delta=value-target,carry=velocity+omega*delta,decay=Math.exp(-omega*dt);
    return {value:target+(delta+carry*dt)*decay,velocity:(velocity-omega*carry*dt)*decay};
  };
  const visibleRect = element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth ? rect : null;
  };
  const shapeOf = element => {
    const rect=visibleRect(element);
    if(!rect)return null;
    return {left:rect.left,top:rect.top,width:rect.width,height:rect.height,
      corner:Math.min(parseFloat(getComputedStyle(element).borderTopLeftRadius)||0,rect.width/2,rect.height/2)};
  };
  // Signed distance to the panel outline. An outward offset retains its straight
  // edges and extends every rounded corner by the same amount.
  const distance = (shape,x,y) => {
    const qx=Math.abs(x-shape.left-shape.width/2)-(shape.width/2-shape.corner);
    const qy=Math.abs(y-shape.top-shape.height/2)-(shape.height/2-shape.corner);
    return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-shape.corner;
  };
  const reachOf = (shape,size) => Math.max(...[[0,0],[size.width,0],[0,size.height],[size.width,size.height]].map(([x,y])=>distance(shape,x,y)))+160;
  const expanded = (shape,amount) => ({left:shape.left-amount,top:shape.top-amount,width:shape.width+amount*2,height:shape.height+amount*2,corner:shape.corner+amount});
  // Seven non-overlapping gradient tiles form a feathered rounded rectangle.
  // This is native CSS throughout: no per-frame data URLs, filters or snapshots.
  const field = (shape,amount,rect,inner,outer='transparent',feather=110) => {
    const box=expanded(shape,amount),r=Math.max(.01,box.corner),f=Math.min(feather,r);
    const x=box.left-rect.left,y=box.top-rect.top,w=box.width,h=box.height;
    const ramp=`${inner} ${Math.max(0,r-f)}px, ${outer} ${r}px`;
    const images=['100% 100%','0% 100%','0% 0%','100% 0%'].map(at=>`radial-gradient(circle at ${at}, ${ramp})`);
    images.push(`linear-gradient(to bottom, ${outer}, ${inner} ${f}px, ${inner} calc(100% - ${f}px), ${outer})`,
      `linear-gradient(to right, ${outer}, ${inner} ${f}px)`,
      `linear-gradient(to left, ${outer}, ${inner} ${f}px)`);
    const sizes=[...Array(4).fill([r,r]),[Math.max(0,w-2*r),h],[r,Math.max(0,h-2*r)],[r,Math.max(0,h-2*r)]];
    const positions=[[x,y],[x+w-r,y],[x+w-r,y+h-r],[x,y+h-r],[x+r,y],[x,y+r],[x+w-r,y+r]];
    // Outside material occupies disjoint strips. A full background underneath
    // would incorrectly keep an opaque old color below transparent new material.
    if(outer!=='transparent'){
      const width=rect.width,height=rect.height,top=Math.max(0,Math.min(height,y)),bottom=Math.max(0,Math.min(height,y+h));
      const right=Math.max(0,Math.min(width,x+w)),left=Math.max(0,Math.min(width,x));
      images.push(...Array(4).fill(`linear-gradient(${outer},${outer})`));
      sizes.push([width,top],[width,height-bottom],[left,bottom-top],[width-right,bottom-top]);
      positions.push([0,0],[0,bottom],[0,top],[right,top]);
    }
    return {image:images.join(','),size:sizes.map(([a,b])=>`${a}px ${b}px`).join(','),
      position:positions.map(([a,b])=>`${a}px ${b}px`).join(','),repeat:'no-repeat'};
  };
  globalThis.HaloWave = {
    geometry:{distance,expanded,field,reachOf,advance},
    create({ host, trigger, layers, ready, themeAttribute, surfaceSelector, animateSurfaces = true }) {
      let enabled = true, active = null, frame = 0, pendingCleanup = null, keyboard = false;
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
              for (const record of state.layers) record.element.style.setProperty('clip-path','inset(50% 50% 50% 50%)','important');
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
            active.duration = 1100;
            active.overlay.dataset.target = String(target);
            // Retarget the existing radius and rendering; never layer another animation on top.
            commit(); return;
          }
          if (target === enabled || (!target && !ready()) || media.matches || keyboard || document.hidden || document.fullscreenElement || document.webkitFullscreenElement || !CSS.supports('clip-path', 'inset(1px round 24px)')) {
            enabled = target; commit(); return;
          }
          const shape = shapeOf(trigger()) || shapeOf(host);
          const originRect=shape;
          if (!originRect) { enabled = target; commit(); return; }
          const size = viewport();
          const origin = { x: Math.min(size.width, Math.max(0, originRect.left + originRect.width / 2)), y: Math.min(size.height, Math.max(0, originRect.top + originRect.height / 2)) };
          const reach = reachOf(shape,size);
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
          shadow.append(canvas);
          const guard = document.createElement('style');
          guard.textContent = 'html[data-halo-wave="waiting"] :is(#bili-ambient-layer,#halo-x-layer,#halo-youtube-layer){clip-path:inset(50% 50% 50% 50%)!important}';
          document.documentElement.append(guard, overlay);
          overlay.dataset.originX = String(origin.x); overlay.dataset.originY = String(origin.y); overlay.dataset.target = String(target);
          active = { target, commit, origin, shape, reach, size, canvas, dpr, surfaces, layers: [], overlay, guard, context, lastPaint: -Infinity, lastStep:0, velocity:0, radius: target ? 0 : reach, from: target ? 0 : reach, to: target ? reach : 0, started: 0, queued: performance.now(), duration: 1100 };
          document.documentElement.setAttribute('data-halo-wave', target ? 'waiting' : 'running');
          // Freeze only pre-change material styles; video and renderer continue updating.
          for (const record of surfaces) {
            writePaint(record,'transition','none');
            writePaint(record,'background-color',record.before.background);
            writePaint(record,'color',record.before.color);
          }
          commit();
          const captureLayers = state => {
            state.layers = [...layers()].map(element => ({ element, rect: element.getBoundingClientRect(), original: Object.fromEntries(['clip-path','mask-image','mask-size','mask-position','mask-repeat','-webkit-mask-image','-webkit-mask-size','-webkit-mask-position','-webkit-mask-repeat'].map(name=>[name,{value:element.style.getPropertyValue(name),priority:element.style.getPropertyPriority(name)}])) }));
          };
          const refreshGeometry = state => {
            const nextSize=viewport(), rect=shapeOf(trigger()) || shapeOf(host);
            if (!rect) return;
            const oldReach=state.reach;
            state.size=nextSize;state.shape=rect;
            state.origin={x:Math.min(nextSize.width,Math.max(0,rect.left+rect.width/2)),y:Math.min(nextSize.height,Math.max(0,rect.top+rect.height/2))};
            state.reach=reachOf(rect,nextSize);
            state.from=state.from/oldReach*state.reach;state.to=state.target?state.reach:0;state.radius=state.radius/oldReach*state.reach;
            for (const record of state.surfaces) {
              record.rect=record.element.getBoundingClientRect();
              const {left,right,top,bottom}=record.rect, {x,y}=state.origin;
              const l=Math.max(0,left),r=Math.min(state.size.width,right),t=Math.max(0,top),b=Math.min(state.size.height,bottom);
              record.near=Math.max(0,distance(state.shape,Math.max(l,Math.min(x,r)),Math.max(t,Math.min(y,b))));
              record.far=Math.max(...[[l,t],[r,t],[l,b],[r,b]].map(([px,py])=>distance(state.shape,px,py)));
              record.phase=null;
            }
            for (const record of state.layers) record.rect=record.element.getBoundingClientRect();
            const width=Math.ceil(nextSize.width*state.dpr),height=Math.ceil(nextSize.height*state.dpr);
            if(state.canvas.width!==width || state.canvas.height!==height){state.canvas.width=width;state.canvas.height=height;state.context.scale(state.dpr,state.dpr);}
            state.overlay.dataset.shape='rounded-rect';state.overlay.dataset.left=String(rect.left);state.overlay.dataset.top=String(rect.top);state.overlay.dataset.width=String(rect.width);state.overlay.dataset.height=String(rect.height);state.overlay.dataset.corner=String(rect.corner);
            state.overlay.dataset.originX=String(state.origin.x);state.overlay.dataset.originY=String(state.origin.y);
          };
          const paint = state => {
            const radius = Math.max(0, state.radius);
            // This is the actual live ambient renderer, not a decorative substitute.
            for (const record of state.layers) {
              const box=expanded(state.shape,radius),rect=record.rect;
              record.element.style.setProperty('clip-path',`inset(${box.top-rect.top}px ${rect.right-box.left-box.width}px ${rect.bottom-box.top-box.height}px ${box.left-rect.left}px round ${box.corner}px)`,'important');
              const mask=field(state.shape,radius,rect,`rgba(0,0,0,${Math.min(1,radius/80)})`);
              for(const prefix of ['','-webkit-'])for(const name of ['image','size','position','repeat'])record.element.style.setProperty(`${prefix}mask-${name}`,mask[name],'important');
            }
            for (const record of state.surfaces) {
              const { element, rect, off, on, textOnly } = record;
              if (!element.isConnected) continue;
              const phase = radius <= 0 ? 'off' : radius > record.far + 150 ? 'on' : radius < record.near - 150 ? 'off' : 'front';
              if (phase !== 'front' && phase === record.phase) continue;
              record.phase = phase;
              if (phase !== 'front') {
                // Resolve completed regions to a flat material, not a lingering gradient.
                const material = phase === 'on' ? on : off;
                writePaint(record,'background-image',record.backgroundDelegated?'none':material.image);
                writePaint(record,'background-color',record.backgroundDelegated?'transparent':material.background);
                for(const [name,key]of [['size','size'],['position','position'],['repeat','repeat']])writePaint(record,`background-${name}`,material[key]);
                writePaint(record,'color',material.color);
                if(textOnly)writePaint(record,'-webkit-text-fill-color',material.color);
                continue;
              }
              // The feather extends past radius zero. Fade its inner material too,
              // so the final restore never removes a still-visible patch of light.
              const tail = Math.min(1,radius/150);
              const innerBackground = mix(off.background,on.background,tail);
              const innerColor = mix(off.color,on.color,tail);
              const applyField=(inner,outer,feather)=>{
                const paintRect=element===document.documentElement?{left:rect.left,top:rect.top,width:Math.max(rect.width,state.size.width),height:Math.max(rect.height,state.size.height)}:rect;
                const paint=field(state.shape,radius,paintRect,inner,outer,feather);
                for(const name of ['image','size','position','repeat'])writePaint(record,`background-${name}`,paint[name]);
              };
              if(record.backgroundDelegated){
                writePaint(record,'background-image','none');
                writePaint(record,'background-color','transparent');
              } else if (off.image === 'none' && on.image === 'none' && off.background !== on.background) {
                writePaint(record,'background-color','transparent');
                applyField(innerBackground,off.background,110);
              }
              if (off.color !== on.color) {
                if (textOnly) {
                  applyField(innerColor,off.color,80);
                  writePaint(record,'background-clip','text');
                  writePaint(record,'-webkit-background-clip','text');
                  writePaint(record,'-webkit-text-fill-color','transparent');
                } else {
                  // Containers keep their inherited baseline; leaf glyphs carry the spatial reveal.
                  const directText = record.directText;
                  const offset = distance(state.shape,rect.left+rect.width/2,rect.top+rect.height/2);
                  writePaint(record,'color',directText ? mix(off.color,on.color,tail*Math.max(0,Math.min(1,(radius-offset)/80))) : off.color);
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
              // Transparent containers must share their ancestor's reveal, rather than
              // stacking the same opaque off material at every layout boundary.
              const byElement=new Map(state.surfaces.map(record=>[record.element,record]));
              for(const record of state.surfaces){
                if(record.off.image!=='none'||record.on.image!=='none'||! /^(transparent|rgba\(0, 0, 0, 0\))$/.test(record.on.background))continue;
                for(let parent=record.element.parentElement;parent;parent=parent.parentElement){
                  const ancestor=byElement.get(parent);
                  if(!ancestor)continue;
                  record.backgroundDelegated=ancestor.off.image==='none'&&ancestor.off.background===record.off.background;
                  break;
                }
              }
              for (const record of state.surfaces) writePaint(record,'transition','none');
              captureLayers(state); refreshGeometry(state); state.started=now; state.lastStep=now;
              document.documentElement.setAttribute('data-halo-wave','running');
            }
            // High-refresh displays need not rasterize this broad light field at 240 Hz.
            // The radius is still time-based, so skipped paints never extend the transition.
            if(now-state.lastPaint < 1000/60-.5 && now-state.started < state.duration){frame=requestAnimationFrame(tick);return;}
            state.lastPaint=now;
            const currentSize=viewport();
            if(currentSize.width!==state.size.width || currentSize.height!==state.size.height) refreshGeometry(state);
            const progress=Math.min(1,(now-state.started)/state.duration);
            const next=advance(state.radius,state.velocity,state.to,Math.max(0,(now-state.lastStep)/1000),8);
            state.lastStep=now;state.radius=Math.max(0,Math.min(state.reach,next.value));state.velocity=next.velocity;
            const settled=Math.abs(state.radius-state.to)<.25&&Math.abs(state.velocity)<3;
            if(settled || progress>=1){state.radius=state.to;state.velocity=0;}
            try { paint(state); } catch { controller.finish(); return; }
            if (settled || progress>=1) { controller.finish(); return; }
            frame=requestAnimationFrame(tick);
          };
          frame=requestAnimationFrame(tick);
        },
      };
      // A few canvas strokes track the very same panel offset as the CSS reveal.
      // No central flare: the launch is the panel's entire border.
      function drawWave(state) {
        const ctx=state.context,r=state.radius,box=expanded(state.shape,r);
        ctx.clearRect(0,0,state.size.width,state.size.height);
        if(r<=0)return;
        const envelope=Math.min(1,r/36,(state.reach-r)/140);
        ctx.beginPath();ctx.roundRect(box.left,box.top,box.width,box.height,box.corner);
        for(const [width,alpha]of [[52,.035],[22,.055],[2,.15]]){
          ctx.lineWidth=width;ctx.strokeStyle=`rgba(243,199,128,${alpha*envelope})`;ctx.stroke();
        }
      }
      window.addEventListener('keydown',()=>{keyboard=true;},{capture:true});
      window.addEventListener('pointerdown',()=>{keyboard=false;},{capture:true,passive:true});
      const settle = () => controller.finish();
      for (const event of ['resize','scroll','pagehide']) window.addEventListener(event,settle,{passive:true});
      for (const event of ['visibilitychange','fullscreenchange','webkitfullscreenchange']) document.addEventListener(event,settle);
      media.addEventListener('change',settle);
      return controller;
    },
  };
})();
