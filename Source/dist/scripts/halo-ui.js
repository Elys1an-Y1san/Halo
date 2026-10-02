/* Shared optical control surface. Kept in the isolated extension world. */
globalThis.HaloUI = {
  presets: {
    soft: { blur: 40, spread: 50, brightness: 80 },
    cinema: { blur: 60, spread: 100, brightness: 100 },
    wide: { blur: 85, spread: 150, brightness: 110 },
  },
  css: `
:host {
  all: initial; position: fixed; width: 360px; height: 44px; --edge: 24px; max-width: calc(100% - 48px); right: 24px; bottom: 24px; z-index: 2147483646;
  color-scheme: dark; font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
  color: #f2f3f4; --ink: #f2f3f4; --muted: #a1a5ac; --accent: #f3c780;
  --surface: #141619; --line: #ffffff17; --ease: cubic-bezier(.2,.8,.2,1); --ease-out: cubic-bezier(.23,1,.32,1);
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
button, input { font: inherit; }
button { cursor: pointer; -webkit-tap-highlight-color: transparent; }
button:disabled { cursor: default; opacity: .5; }
button { color: inherit; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
#panel {
  position: absolute; right: 0; bottom: 54px; width: 360px; max-width: 100%; max-height: calc(100dvh - var(--edge) - var(--edge) - 54px);
  overflow-x: hidden; overflow-y: auto; scrollbar-gutter: stable; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #51555d transparent;
  margin: 0; padding: 22px; background: var(--surface); border: 1px solid #ffffff25;
  border-radius: 18px; box-shadow: 0 20px 60px #0007, 0 2px 8px #0004;
  transform-origin: calc(100% - 44px) calc(100% + 32px); opacity: 1; transform: none; transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out);
}
#panel[data-state=closed] { opacity: 0; transform: translateY(8px) scale(.97); pointer-events: none; transition-duration: 180ms; }
header { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 12px; }
h2 { font-size: 22px; font-weight: 500; letter-spacing: -.045em; line-height: 1.3; margin: 0; text-wrap: balance; }
#close { display: grid; place-items: center; flex: 0 0 32px; width: 32px; height: 32px; border: 1px solid var(--line); border-radius: 50%; background: transparent; }
#close:hover { background: #ffffff0c; color: var(--accent); }
svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
#toggle { display: flex; align-items: center; gap: 9px; margin-left: auto; padding: 0 16px; height: 44px; border: 1px solid #ffffff30; border-radius: 100px; background: #141619; box-shadow: 0 4px 20px #0005; transition: border-color 160ms, transform 160ms var(--ease); }
#toggle:hover { border-color: var(--accent); }
@media (hover:hover) and (pointer:fine) { #toggle:hover { transform: translateY(-2px); } }
#toggle[aria-expanded=true] { border-color: #f3c78080; }
.brand-mark { display: inline-block; width: 18px; height: 18px; border: 1.5px solid var(--accent); border-radius: 50%; box-shadow: inset 4px 0 0 #f3c78050; transform: rotate(-35deg); }
.power { position: relative; isolation: isolate; display: flex; justify-content: space-between; align-items: center; gap: 12px; min-height: 44px; margin: 6px 0 20px; cursor: pointer; }
.power-title { position: relative; z-index: 1; font-size: 13px; font-weight: 500; transition: color 220ms; }
.power[data-enabled=false] .power-title { color: var(--muted); }
.power-effect { pointer-events: none; position: absolute; right: 0; top: 50%; width: 40px; height: 40px; border: 1px solid var(--accent); border-radius: 50%; box-shadow: 0 0 18px #f3c78030, inset 0 0 12px #f3c78015; opacity: 0; transform: translateY(-50%) scale(.5); }
input[type=checkbox] { appearance: none; -webkit-appearance: none; z-index: 1; flex-shrink: 0; margin: 0; width: 40px; height: 24px; border: 1px solid #ffffff25; border-radius: 24px; background: #35383e; cursor: pointer; position: relative; transition: background 220ms, border-color 220ms, box-shadow 280ms; }
input[type=checkbox]:before { content: ""; position: absolute; left: 3px; top: 3px; width: 16px; height: 16px; border-radius: 50%; background: #d4d7dc; transition: transform 180ms var(--ease), background 160ms; }
input[type=checkbox]:checked { background: var(--accent); border-color: var(--accent); box-shadow: 0 0 14px #f3c78025; }
input[type=checkbox]:checked:before { background: #202226; transform: translateX(16px); }
.section-label { display: flex; justify-content: space-between; margin: 0 0 8px; color: var(--muted); font-size: 11px; letter-spacing: .015em; }
#mode-label { color: var(--accent); }
.presets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }
.presets button { position: relative; display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 44px; border: 1px solid var(--line); border-radius: 6px; background: #ffffff03; color: #b7bbc3; font-size: 12px; letter-spacing: .02em; transition: background 160ms, color 160ms, border-color 160ms, transform 160ms var(--ease); }
.presets button:hover { background: #ffffff0b; border-color: #ffffff35; color: var(--ink); }
.presets button:active { transform: scale(.97); }
.presets button[aria-pressed=true] { background: #f3c78010; border-color: #f3c78065; color: var(--accent); }
.preset-symbol { display: block; width: 13px; height: 13px; border: 1px solid currentColor; border-radius: 50%; }
.preset-symbol.soft { box-shadow: 0 0 0 3px #ffffff08; }
.preset-symbol.cinema { border-radius: 2px; height: 10px; box-shadow: 0 0 0 2px #f3c78010; }
.preset-symbol.wide { width: 16px; height: 9px; border-radius: 50%; box-shadow: 0 0 0 2px #ffffff08; }
.adjustments { border-top: 1px solid var(--line); padding-top: 10px; }
.range-row + .range-row { margin-top: 4px; }
.range-label { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 12px; }
.range-label small { font: 10px/1.3 ui-monospace, "SFMono-Regular", Consolas, monospace; letter-spacing: .06em; color: var(--muted); margin-left: 8px; }
output { color: var(--ink); font: 13px/1.4 ui-monospace, "SFMono-Regular", Consolas, monospace; font-variant-numeric: tabular-nums; }
output:after { content: "%"; color: var(--muted); font-size: 10px; margin-left: 3px; }
input[type=range] { appearance: none; -webkit-appearance: none; display: block; width: 100%; height: 24px; margin: 0; padding: 0; cursor: pointer; background: transparent; --fill: 50%; }
input[type=range]::-webkit-slider-runnable-track { height: 3px; border-radius: 3px; background: linear-gradient(to right, var(--accent) 0 var(--fill), #373b42 var(--fill) 100%); }
input[type=range]::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 12px; height: 12px; margin-top: -4.5px; border: 2px solid #141619; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 1px var(--accent); transition: box-shadow 160ms; }
input[type=range]:hover::-webkit-slider-thumb, input[type=range]:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 1px var(--accent), 0 0 0 5px #f3c78018; }
input[type=range]::-moz-range-track { height: 3px; border-radius: 3px; background: #373b42; }
input[type=range]::-moz-range-progress { height: 3px; background: var(--accent); }
input[type=range]::-moz-range-thumb { width: 10px; height: 10px; border: 2px solid #141619; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
footer { display: flex; align-items: center; gap: 8px; justify-content: space-between; border-top: 1px solid var(--line); margin-top: 10px; padding-top: 8px; }
#status { margin: 0; color: var(--muted); font-size: 11px; line-height: 1.5; letter-spacing: .015em; overflow-wrap: anywhere; }
#reset { display: flex; align-items: center; gap: 4px; min-height: 30px; flex-shrink: 0; background: transparent; border: 0; padding: 0 3px; border-radius: 4px; color: #bfc3ca; font-size: 11px; }
#reset svg { width: 12px; height: 12px; }
#reset:hover { color: var(--accent); }
.update-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 4px; min-height: 32px; }
#check-update { border: 0; border-radius: 4px; background: transparent; padding: 0 3px; min-height: 32px; color: var(--muted); font-size: 11px; }
#check-update:hover { color: var(--accent); }
#install-update { border:0; padding:0 3px; min-height:32px; color:var(--accent); background:transparent; font-size:11px; }
#release-link { color: var(--accent); text-decoration: none; font-size: 11px; min-height: 32px; display: flex; align-items: center; }
#version { color: var(--muted); font: 10px/1.5 ui-monospace,monospace; }
#update-status { margin: 0; height: 17px; line-height: 17px; color: var(--muted); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

@media(max-width:480px) { :host { --edge: 16px; right: 16px; bottom: 16px; max-width: calc(100% - 32px); } }
@media(max-width:350px) { #panel { padding: 18px; } h2 { font-size: 22px; } .range-label small { margin-left: 6px; } }
@media(prefers-reduced-motion:reduce) { #panel, #panel[data-state=closed] { transform: none; transition: opacity 120ms ease !important; } *, *:before, *:after { animation: none !important; transition: none !important; } }
`,
  popupCss: `
:host { all: initial; display: block; color-scheme: dark; font: 13px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; color: var(--ink, #f2f3f4); }
#panel { position: static; opacity: 1; transform: none; transition: none; width: 100%; max-width: none; max-height: none; overflow: visible; border: 0; border-radius: 0; box-shadow: none; margin: 0; padding: 18px 24px 10px; animation: none; }
#close, #toggle { display: none; }
@media(max-width:350px) { #panel { padding: 18px 20px 10px; } }
`,
  markup: `
<section id="panel" role="region" aria-label="映光设置" hidden>
  <header><h2>让画面，漫出边界</h2><button id="close" aria-label="关闭设置"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
  <label class="power" for="enabled" id="power"><span class="power-title">环境光</span><span id="power-effect" class="power-effect" aria-hidden="true"></span><input id="enabled" type="checkbox" role="switch" aria-label="启用环境光"></label>
  <p class="section-label"><span>光效预设</span><span id="mode-label">影院</span></p>
  <div class="presets" role="group" aria-label="光效预设">
    <button data-preset="soft" aria-pressed="false"><i class="preset-symbol soft" aria-hidden="true"></i>柔和</button>
    <button data-preset="cinema" aria-pressed="false"><i class="preset-symbol cinema" aria-hidden="true"></i>影院</button>
    <button data-preset="wide" aria-pressed="false"><i class="preset-symbol wide" aria-hidden="true"></i>漫射</button>
  </div>
  <div class="adjustments">
    <div class="range-row"><label class="range-label" for="blur"><span>模糊<small>BLUR</small></span><output id="blur-value" for="blur"></output></label><input id="blur" aria-label="模糊 Blur" type="range" min="0" max="100" step="1"></div>
    <div class="range-row"><label class="range-label" for="spread"><span>扩散<small>SPREAD</small></span><output id="spread-value" for="spread"></output></label><input id="spread" aria-label="扩散 Spread" type="range" min="0" max="200" step="1"></div>
    <div class="range-row"><label class="range-label" for="brightness"><span>亮度<small>LIGHT</small></span><output id="brightness-value" for="brightness"></output></label><input id="brightness" aria-label="环境光亮度" type="range" min="20" max="180" step="1"></div>
  </div>
  <footer><p id="status" role="status" aria-live="polite"></p><button id="reset"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></svg>重置</button></footer>
  <div class="update-row"><button id="check-update">检查更新</button><a id="release-link" hidden target="_blank" rel="noopener noreferrer">查看新版 ↗</a><button id="install-update" hidden>安装更新</button><span id="version"></span></div>
  <p id="update-status" role="status" aria-live="polite"></p>
</section>
<button id="toggle" aria-label="映光设置" aria-expanded="false" aria-controls="panel"><span class="brand-mark" aria-hidden="true"></span>映光</button>
`,
  bindUpdates(root, api) {
    const install=root.getElementById('install-update');
    let native=false;
    const send = message => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('background_timeout')), 12000);
      Promise.resolve().then(() => api.runtime.sendMessage(message)).then(resolve, reject).finally(() => clearTimeout(timer));
    });
    // An unavailable background must never prevent the light controls from binding.
    send({type:'halo-native-update-info'}).then(result=>{native=result?.supported===true;},()=>{});
    install.addEventListener('click',async()=>{
      install.disabled=true;button.disabled=true;status.textContent='正在启动安装…';
      try {const result=await send({type:'halo-install-update'});status.textContent=result?.ok?'更新器已启动，请查看原生窗口':result?.code==='current'?'已是最新版本':'安装启动失败，请重试';}
      catch {status.textContent='安装启动失败，请重试';}
      finally{install.disabled=false;button.disabled=false;}
    });
    const button=root.getElementById('check-update'),status=root.getElementById('update-status'),link=root.getElementById('release-link');
    root.getElementById('version').textContent=`v${api.runtime.getManifest?.().version || '1.0.3'}`;
    button.addEventListener('click',async()=>{
      button.disabled=true;button.textContent='正在查询…';link.hidden=true;install.hidden=true;status.textContent='';
      try {
        const result=await send({type:'halo-check-update',force:true});
        if (!result?.ok) {
          status.textContent=result?.code==='no_release'?'暂无已发布版本':result?.code==='rate_limit'?'查询过于频繁，请稍后重试':'查询失败，请检查网络后重试';
          return;
        }
        const url=new URL(result.url);
        if(url.origin!=='https://github.com'||!url.pathname.startsWith('/Elys1an-Y1san/Halo/releases/tag/'))throw Error('Invalid release link');
        status.textContent=result.available?`新版本 ${result.latest} 可用`:`已是最新版本 ${result.current}`;
        if(result.available){link.href=url.href;link.hidden=false;install.hidden=!native;}
      } catch { status.textContent='查询失败，请检查网络后重试'; }
      finally {button.disabled=false;button.textContent='检查更新';}
    });
  },
  createPanel(root, { popup = false } = {}) {
    const panel = root.getElementById('panel'), toggle = root.getElementById('toggle');
    let open = false, timer;
    const settle = () => {
      clearTimeout(timer);
      // Flush a just-requested entry as well as already-running transitions.
      panel.style.setProperty('transition', 'none', 'important');
      panel.getAnimations().forEach(animation => animation.cancel());
      panel.getBoundingClientRect();
      if (!open) panel.hidden = true;
    };
    panel.dataset.state = 'closed';
    panel.inert = true;
    panel.addEventListener('transitionend', event => { if (event.target === panel && event.propertyName === 'opacity' && !open) { panel.hidden = true; clearTimeout(timer); } });
    return {
      get isOpen() { return open; },
      settle,
      setOpen(value) {
        value = popup || value;
        if (open === value && !panel.hidden) return;
        clearTimeout(timer);
        panel.getBoundingClientRect();
        panel.style.removeProperty('transition');
        open = value;
        toggle.setAttribute('aria-expanded', String(open));
        panel.setAttribute('aria-hidden', String(!open));
        panel.inert = !open;
        if (open) {
          const wasHidden = panel.hidden;
          panel.hidden = false;
          if (wasHidden && !popup) { panel.dataset.state = 'closed'; panel.getBoundingClientRect(); }
          panel.dataset.state = 'open';
          if (!popup) root.getElementById('enabled').focus({ preventScroll: true });
        } else {
          panel.dataset.state = 'closed';
          toggle.focus({ preventScroll: true });
          timer = setTimeout(() => { if (!open) panel.hidden = true; }, 240);
        }
      },
    };
  },
  sync(root, settings) {
    const names = { soft: '柔和', cinema: '影院', wide: '漫射' };
    let mode = '自定义';
    root.getElementById('enabled').checked = settings.enabled;
    root.getElementById('enabled').setAttribute('aria-checked', String(settings.enabled));
    for (const key of ['blur', 'spread', 'brightness']) {
      const input = root.getElementById(key);
      input.value = settings[key];
      input.style.setProperty('--fill', `${(settings[key] - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
      input.setAttribute('aria-valuetext', `${settings[key]}%`);
      root.getElementById(`${key}-value`).value = String(settings[key]);
    }
    root.querySelectorAll('[data-preset]').forEach(button => {
      const selected = Object.entries(this.presets[button.dataset.preset]).every(([key, value]) => settings[key] === value);
      button.setAttribute('aria-pressed', String(selected));
      if (selected) mode = names[button.dataset.preset];
    });
    root.getElementById('mode-label').textContent = mode;
    const power = root.getElementById('power');
    const previous = power.dataset.enabled;
    power.dataset.enabled = String(settings.enabled);
    if (previous !== undefined && previous !== power.dataset.enabled) {
      const effect = root.getElementById('power-effect');
      effect.getAnimations().forEach(animation => animation.cancel());
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches && !root.getElementById('panel').hidden) {
        const scales = settings.enabled ? [.55, 1.1, 1.85] : [1.7, 1, .45];
        effect.animate(scales.map((scale, index) => ({
          transform: `translateY(-50%) scale(${scale})`,
          opacity: index === 1 ? .65 : 0,
        })), { duration: settings.enabled ? 520 : 360, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    }
  },
};
