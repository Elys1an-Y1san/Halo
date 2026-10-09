/* Shared optical control surface. Kept in the isolated extension world. */
globalThis.HaloUI = {
  presets: {
    soft: { blur: 40, spread: 50, brightness: 80 },
    cinema: { blur: 60, spread: 100, brightness: 100 },
    wide: { blur: 85, spread: 150, brightness: 110 },
  },
  defaults: { enabled: true, blur: 60, spread: 100, brightness: 100, quality: 'auto', position: 'auto', profiles: [], lastCustom: null, anchor: null },
  qualities: { auto: 30, eco: 15, balanced: 30, smooth: 60 },
  light(value) {
    return Object.fromEntries([['blur',0,100,60],['spread',0,200,100],['brightness',20,180,100]].map(([key,min,max,fallback]) => [key, value?.[key] != null && Number.isFinite(Number(value[key])) ? Math.round(Math.max(min,Math.min(max,Number(value[key])))) : fallback]));
  },
  normalize(value = {}) {
    value = value || {};
    return { ...this.defaults, ...this.light(value), enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
      quality: Object.hasOwn(this.qualities,value.quality) ? value.quality : 'auto',
      position: ['auto','left','right'].includes(value.position) ? value.position : 'auto',
      anchor: value.anchor && Number.isFinite(value.anchor.x) && Number.isFinite(value.anchor.y) ? {x:Math.max(0,Math.min(1,value.anchor.x)),y:Math.max(0,Math.min(1,value.anchor.y))} : null,
      lastCustom: value.lastCustom ? this.light(value.lastCustom) : null,
      profiles: Array.isArray(value.profiles) ? value.profiles.filter(p => p && typeof p.name === 'string').slice(0,12).map(p => ({name:p.name.slice(0,24), ...this.light(p)})) : [] };
  },
  css: `
:host {
  all:initial; pointer-events:none; position:fixed; width:336px; height:40px; --edge:24px; max-width:calc(100% - 48px); right:24px; bottom:24px; z-index:2147483646;
  color-scheme:dark; font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;
  --ink:#f2f3f4; --muted:#a7acb5; --accent:#f3c780; --surface:#17191e; --line:#ffffff14; --ease:cubic-bezier(0.2,0,0,1); color:var(--ink);
}
*{box-sizing:border-box}
[hidden]{display:none!important}
button,input,select{font:inherit;color:inherit}
button{cursor:pointer;-webkit-tap-highlight-color:transparent;border:0;background:transparent;padding:0;transition:scale 150ms ease-out,color 120ms ease-out,background-color 120ms ease-out}
button:not(:disabled):not([data-static]):active{scale:0.96}
button:disabled{cursor:default;opacity:.38}
:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
#panel{pointer-events:auto;position:absolute;right:0;bottom:50px;width:336px;max-width:100%;height:468px;max-height:calc(100dvh - var(--edge) * 2 - 50px);display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto auto minmax(0,1fr) auto;gap:0;padding:16px;background:var(--surface);border-radius:24px;box-shadow:0 0 0 1px #ffffff18,0 8px 24px #0003,0 24px 64px #0005;opacity:1;transform:translateY(0);transform-origin:bottom right;transition:opacity 180ms ease-out,transform 180ms ease-out;overflow:hidden}
#panel[data-state=closed]{opacity:0;transform:translateY(6px);pointer-events:none;transition-duration:130ms}
header{display:flex;justify-content:space-between;align-items:center;height:28px;margin-bottom:10px}
h2{font-size:14px;font-weight:600;letter-spacing:.01em;margin:0;display:flex;gap:8px;align-items:center}
#close{width:28px;height:28px;display:grid;place-items:center;border-radius:8px;color:var(--muted)}
#close:hover{background:#ffffff09;color:var(--ink)}
#toggle{pointer-events:auto;display:flex;align-items:center;gap:8px;margin-left:auto;height:40px;padding:0 14px;border-radius:20px;background:var(--surface);box-shadow:0 0 0 1px #ffffff22,0 4px 16px #0004;color:#d4d7de}
#toggle{touch-action:none;user-select:none;cursor:grab}
#toggle[data-dragging=true]{cursor:grabbing;scale:1!important}
#toggle:hover,#toggle[aria-expanded=true]{color:var(--accent);background:#25262b}
.brand-mark{display:inline-block;width:16px;height:16px;border:1.5px solid currentColor;border-radius:50%;box-shadow:inset 4px 0 0 #f3c78040;transform:rotate(-35deg);color:var(--accent)}
.power{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:56px;padding:0 0 12px}
.power-copy{min-width:0;flex:1}.power-title{display:block;font-size:17px;font-weight:500;line-height:1.5;cursor:pointer}
#runtime-status{margin:2px 0 0;font-size:11px;line-height:17px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#retry{font-size:11px;color:var(--accent);min-height:24px;margin:0 0 0 6px;flex-shrink:0}
.switch{position:relative;display:grid;place-items:center;width:52px;height:40px;flex-shrink:0;cursor:pointer}
.power-effect{position:absolute;inset:-4px;background:radial-gradient(ellipse,#f3c78060,transparent 70%);opacity:0;transform:scale(.55);pointer-events:none;transition:transform 360ms var(--ease),opacity 150ms ease-out}
.power[data-enabled=true] .power-effect{opacity:.85;transform:scale(1.25)}
input[type=checkbox]{appearance:none;-webkit-appearance:none;position:relative;z-index:1;cursor:pointer;width:44px;height:26px;margin:0;border:0;border-radius:13px;background:#393d45;box-shadow:inset 0 0 0 1px #ffffff0c;transition:background-color 150ms ease-out}
input[type=checkbox]:before{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:10px;background:#c9cdd4;box-shadow:0 1px 3px #0003;transform:translateX(0);transition:transform 260ms var(--ease),background-color 150ms ease-out}
input[type=checkbox]:checked{background:var(--accent)}
input[type=checkbox]:checked:before{background:#292722;transform:translateX(18px)}
.power[data-initial=true] .power-effect,.power[data-initial=true] input,.power[data-initial=true] input:before{transition:none}
.tabs{position:relative;display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--line);height:38px;margin-bottom:14px;--tab-index:0}
.tabs:after{content:"";position:absolute;bottom:-1px;left:0;width:33.333%;height:2px;background:var(--accent);border-radius:2px;transform:translateX(calc(var(--tab-index) * 100%));transition:transform 150ms var(--ease);pointer-events:none}
.tabs button{color:var(--muted);font-size:12px;min-width:0}
.tabs button:hover,.tabs button[aria-selected=true]{color:var(--ink)}
.views{min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#555963 transparent;padding:0 2px 2px}
.view{min-height:100%;display:flex;flex-direction:column}
.section-label{display:flex;justify-content:space-between;align-items:center;margin:0 0 8px;font-size:11px;color:var(--muted)}
#mode-label{color:var(--accent)}
.presets{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px;background:#0c0e1266;border-radius:12px;margin-bottom:8px}
.presets button{display:flex;align-items:center;justify-content:center;gap:7px;min-height:30px;border-radius:8px;color:#b9bec7;font-size:12px}
.presets button:hover{background:#ffffff08}
.presets button[aria-pressed=true]{background:#f3c78015;color:var(--accent);box-shadow:inset 0 0 0 1px #f3c78026}
.preset-symbol{width:11px;height:11px;border:1px solid currentColor;border-radius:50%}.preset-symbol.cinema{border-radius:2px;height:9px}.preset-symbol.wide{width:14px;height:8px}
.range-row{display:grid;grid-template-columns:1fr auto;align-items:center;margin-bottom:4px;gap:0 8px}
.range-label{display:flex;align-items:center;gap:8px;font-size:12px;cursor:default}.range-label small{font-size:10px;color:var(--muted)}
.numeric{display:flex;align-items:center;gap:2px;font-size:10px;color:var(--muted)}
input[type=number]{width:44px;height:22px;border:1px solid transparent;background:transparent;border-radius:6px;text-align:right;font-size:12px;font-variant-numeric:tabular-nums;padding:2px 4px;appearance:textfield;-moz-appearance:textfield}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
input[type=number]:hover,input[type=number]:focus{border-color:#ffffff26;background:#ffffff06}
input[type=range]{appearance:none;-webkit-appearance:none;width:100%;grid-column:1/-1;height:18px;margin:0;padding:0 5px;background:transparent;cursor:pointer;--fill:50%}
input[type=range]:focus-visible{outline:none}
input[type=range]::-webkit-slider-runnable-track{height:3px;border-radius:3px;background:linear-gradient(to right,var(--accent) 0 var(--fill),#383c44 var(--fill) 100%)}
input[type=range]::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:11px;height:11px;margin-top:-4px;border-radius:50%;background:var(--accent);border:2px solid var(--surface);box-shadow:0 0 0 1px var(--accent);transition:box-shadow 120ms ease-out}
input[type=range]:hover::-webkit-slider-thumb,input[type=range]:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 1px var(--accent),0 0 0 3px #f3c78080}
input[type=range]::-moz-range-track{height:3px;border-radius:3px;background:#383c44}
input[type=range]::-moz-range-progress{height:3px;background:var(--accent)}
input[type=range]:focus-visible::-moz-range-thumb{box-shadow:0 0 0 1px var(--accent),0 0 0 3px #f3c78080}
input[type=range]::-moz-range-thumb{width:9px;height:9px;border:2px solid var(--surface);border-radius:50%;background:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.light-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding-top:4px}
#compare{display:flex;align-items:center;justify-content:center;min-height:32px;padding:0 12px;border-radius:8px;background:#ffffff08;box-shadow:inset 0 0 0 1px #ffffff0c;font-size:12px}
#compare[aria-pressed=true]{color:var(--accent);background:#f3c78013;box-shadow:inset 0 0 0 1px #f3c78040}
.text-button{min-height:32px;font-size:11px;color:var(--muted);padding:0 4px;border-radius:6px}.text-button:hover{color:var(--ink);background:#ffffff06}
.field{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 16px;font-size:12px}
.field select{max-width:66%;height:34px}.field input,.save-form input{min-width:0}
select,input[type=text],input:not([type]){border:1px solid #ffffff1a;border-radius:8px;background:#202329;color:var(--ink);padding:7px 10px;font-size:12px}
#profiles{display:block;width:100%;height:126px;padding:4px;background:#0c0e1233;border-radius:10px;overflow:auto;margin:0 0 8px}
#profiles option{padding:7px;border-radius:6px;min-height:30px}#profiles option:checked{background:#f3c7801a;color:var(--accent)}
.profile-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto}
.save-form{display:flex;gap:6px;margin-top:10px}.save-form input{flex:1;width:0;height:34px}.save-form button{padding:0 12px;min-height:34px;background:var(--accent);color:#292722;border-radius:8px;font-size:12px;font-weight:500}
.hint{font-size:11px;color:var(--muted);margin:0 0 14px;line-height:1.5}
.preference-group{border-bottom:1px solid var(--line);margin-bottom:12px;padding-bottom:12px}.preference-group .field{margin-bottom:8px}
.update-row{display:flex;align-items:center;gap:8px;min-height:32px;flex-wrap:wrap}
#check-update,#install-update,#release-link{font-size:11px;color:var(--accent);min-height:30px;display:flex;align-items:center;text-decoration:none;border-radius:6px;padding:0 3px}
#version{margin-left:auto;color:var(--muted);font:10px/1.5 ui-monospace,monospace}
#update-status{margin:2px 0 0;min-height:28px;color:var(--muted);font-size:11px;line-height:14px}
#reset-all{align-self:flex-start;margin-top:auto}
footer{display:flex;align-items:center;gap:8px;min-height:32px;border-top:1px solid var(--line);margin-top:10px;padding-top:6px}
#status{flex:1;min-width:0;margin:0;color:var(--muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#undo{flex-shrink:0;min-height:26px;font-size:11px;color:var(--accent);padding:0 4px;border-radius:6px}
:host([data-side=left]) #toggle{margin-left:0;margin-right:auto}
:host([data-top=true]) #panel{top:50px;bottom:auto;transform-origin:top right}
@media(max-width:480px){:host{--edge:16px;right:16px;bottom:16px;max-width:calc(100% - 32px)}}
@media(max-width:350px){#panel{padding:14px;border-radius:22px}.range-label small{display:none}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}#panel,#panel[data-state=closed]{transform:none}.power-effect{display:none}}
`,
  popupCss: `
:host{position:static;display:block;width:auto;max-width:none;height:auto}
#panel{position:static;width:100%;height:420px;max-height:none;grid-template-rows:auto auto minmax(0,1fr) auto;padding:14px 20px 10px;border-radius:0;box-shadow:none;transform:none;transition:none}
header,#toggle{display:none}
@media(max-width:350px){#panel{padding:12px 16px 10px}}
`,
  markup: `
<section id="panel" role="region" aria-label="映光设置" hidden>
 <header><h2><span class="brand-mark" aria-hidden="true"></span>映光</h2><button id="close" aria-label="关闭设置"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>
 <div class="power" id="power"><div class="power-copy"><label class="power-title" for="enabled">环境光</label><p id="runtime-status" role="status" aria-live="polite">等待视频画面</p></div><button id="retry" hidden>重试</button><label class="switch" for="enabled"><span id="power-effect" class="power-effect" aria-hidden="true"></span><input id="enabled" type="checkbox" role="switch" aria-label="启用环境光"></label></div>
 <div class="tabs" role="tablist" aria-label="设置分类"><button id="tab-light" role="tab" aria-selected="true" aria-controls="view-light" data-view="light" data-static>光效</button><button id="tab-profiles" role="tab" aria-selected="false" aria-controls="view-profiles" tabindex="-1" data-view="profiles" data-static>方案</button><button id="tab-settings" role="tab" aria-selected="false" aria-controls="view-settings" tabindex="-1" data-view="settings" data-static>偏好</button></div>
 <div class="views">
  <section id="view-light" class="view" role="tabpanel" aria-labelledby="tab-light">
   <p class="section-label"><span>预设</span><span id="mode-label">影院</span></p>
   <div class="presets" role="group" aria-label="光效预设"><button data-preset="soft" aria-pressed="false"><i class="preset-symbol soft" aria-hidden="true"></i>柔和</button><button data-preset="cinema" aria-pressed="false"><i class="preset-symbol cinema" aria-hidden="true"></i>影院</button><button data-preset="wide" aria-pressed="false"><i class="preset-symbol wide" aria-hidden="true"></i>漫射</button></div>
   <div class="adjustments"><div class="range-row"><label class="range-label" for="blur">模糊<small id="blur-hint">光边柔和程度</small></label><span class="numeric"><input id="blur-number" type="number" min="0" max="100" step="1" aria-label="模糊数值">%<output id="blur-value" for="blur" hidden></output></span><input id="blur" type="range" min="0" max="100" step="1" aria-label="模糊" aria-describedby="blur-hint"></div><div class="range-row"><label class="range-label" for="spread">扩散<small id="spread-hint">光照覆盖范围</small></label><span class="numeric"><input id="spread-number" type="number" min="0" max="200" step="1" aria-label="扩散数值">%<output id="spread-value" for="spread" hidden></output></span><input id="spread" type="range" min="0" max="200" step="1" aria-label="扩散" aria-describedby="spread-hint"></div><div class="range-row"><label class="range-label" for="brightness">亮度<small id="brightness-hint">环境光明暗</small></label><span class="numeric"><input id="brightness-number" type="number" min="20" max="180" step="1" aria-label="亮度数值">%<output id="brightness-value" for="brightness" hidden></output></span><input id="brightness" type="range" min="20" max="180" step="1" aria-label="环境光亮度" aria-describedby="brightness-hint"></div></div>
   <div class="light-actions"><button id="compare" aria-pressed="false">对比原画</button><button id="reset" class="text-button">恢复默认光效</button></div>
  </section>
  <section id="view-profiles" class="view" role="tabpanel" aria-labelledby="tab-profiles" hidden>
   <label class="section-label" for="profiles">我的方案<span id="profile-count">0 / 12</span></label>
   <select id="profiles" size="3" aria-label="已存方案"><option value="">暂无方案，保存一组喜欢的光效</option></select>
   <div class="profile-actions"><button id="last-custom" class="text-button" disabled>恢复上次自定义</button><button id="delete-profile" class="text-button" disabled>删除所选</button></div>
   <div class="save-form"><input id="profile-name" type="text" aria-label="方案名称" maxlength="24" placeholder="为当前光效命名" autocomplete="off"><button id="save-profile">保存</button></div>
  </section>
  <section id="view-settings" class="view" role="tabpanel" aria-labelledby="tab-settings" hidden>
   <div class="preference-group"><label class="field">性能<select id="quality"><option value="auto">自动 · 按负载调节</option><option value="eco">节能 · 15 帧/秒</option><option value="balanced">均衡 · 30 帧/秒</option><option value="smooth">流畅 · 60 帧/秒</option></select></label><p class="hint">自动在 15–30 帧/秒间调节；手动档保持固定上限，不改变视频帧率。</p><label class="field">位置<select id="position"><option value="custom" disabled>拖动位置</option><option value="auto">自动避让</option><option value="left">左侧</option><option value="right">右侧</option></select></label></div>
   <div class="update-row"><button id="check-update">检查更新</button><a id="release-link" hidden target="_blank" rel="noopener noreferrer">查看新版 ↗</a><button id="install-update" hidden>安装更新</button><span id="version"></span></div><p id="update-status" role="status" aria-live="polite"></p>
   <button id="reset-all" class="text-button">恢复全部偏好（保留方案）</button>
  </section>
 </div>
 <footer><p id="status" role="status" aria-live="polite"></p><button id="undo" disabled>撤销</button></footer>
</section>
<button id="toggle" title="点击设置；拖动移动；Alt + 方向键微调" aria-label="映光设置" aria-expanded="false" aria-controls="panel"><span class="brand-mark" aria-hidden="true"></span>映光</button>
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
          status.textContent=!result?'扩展后台未响应，请刷新页面后重试':result.code==='no_release'?'暂无已发布版本':result.code==='rate_limit'?'查询过于频繁，请稍后重试':result.code==='invalid_release'?'版本信息校验失败，请稍后重试':'查询失败，请检查网络后重试';
          return;
        }
        const url=new URL(result.url);
        if(url.origin!=='https://github.com'||!url.pathname.startsWith('/Elys1an-Y1san/Halo/releases/tag/'))throw Error('Invalid release link');
        status.textContent=result.available?`新版本 ${result.latest} 可用`:`已是最新版本 ${result.current}`;
        if(result.available){link.href=url.href;link.hidden=false;install.hidden=!native;}
      } catch (error) { status.textContent=error.message==='background_timeout'?'扩展后台响应超时，请重新打开面板后重试':error.message==='Invalid release link'?'版本信息校验失败，请稍后重试':'无法连接扩展后台，请刷新页面后重试'; }
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
      const number = root.getElementById(`${key}-number`);
      if (number && root.activeElement !== number) number.value = settings[key];
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
    root.getElementById('quality').value = settings.quality || 'auto';
    root.getElementById('position').value = settings.anchor ? 'custom' : settings.position || 'auto';
    root.getElementById('last-custom').disabled = !settings.lastCustom;
    const profiles = root.getElementById('profiles'), selected = profiles.value;
    if (profiles.dataset.items !== JSON.stringify(settings.profiles || [])) {
      profiles.replaceChildren(new Option(settings.profiles?.length ? '选择方案应用光效' : '暂无方案，保存一组喜欢的光效',''), ...(settings.profiles || []).map((p,i) => new Option(p.name,String(i))));
      profiles.options[0].disabled = true;
      profiles.dataset.items = JSON.stringify(settings.profiles || []); profiles.value = selected;
    }
    root.getElementById('delete-profile').disabled = profiles.value === '';
    root.getElementById('profile-count').textContent = `${settings.profiles?.length || 0} / 12`;

    const power = root.getElementById('power');
    if (power.dataset.enabled === undefined) {
      power.dataset.initial = 'true';
      requestAnimationFrame(() => { requestAnimationFrame(() => { delete power.dataset.initial; }); });
    }
    power.dataset.enabled = String(settings.enabled);

  },
};

// Shared editing behavior; render adapters own media and persistence.
HaloUI.bindPreferences = function(root, { get, commit, compare, retry, place }) {
  const $ = id => root.getElementById(id);
  let undo = null, comparing = false, compareGeneration = 0;
  const tabs = [...root.querySelectorAll('[role=tab]')];
  const selectView = name => {
    stopCompare();
    tabs.forEach((tab, index) => {
      const selected = tab.dataset.view === name;
      tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
      $(tab.getAttribute('aria-controls')).hidden = !selected;
      if (selected) tab.parentElement.style.setProperty('--tab-index', index);
    });
  };
  tabs.forEach((tab, index) => {
    tab.onclick = () => selectView(tab.dataset.view);
    tab.onkeydown = event => {
      const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!delta && !['Home','End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + delta + tabs.length) % tabs.length;
      selectView(tabs[next].dataset.view); tabs[next].focus();
    };
  });
  const copy = value => JSON.parse(JSON.stringify(value));
  const change = (patch, remember = false) => {
    const current = get();
    undo = copy(current); $('undo').disabled = false; $('status').textContent = '';
    const next = { ...current, ...patch };
    if (remember) next.lastCustom = this.light(next);
    commit(next);
  };
  const stopCompare = () => { ++compareGeneration; comparing=false; Promise.resolve(compare(false)).catch(()=>{}); $('compare').setAttribute('aria-pressed','false'); $('compare').textContent='对比原画'; };
  $('compare').onclick = async () => {
    const next = !comparing, generation = ++compareGeneration;
    try { if (await compare(next) === false) return; if(generation!==compareGeneration){await compare(false);return;} comparing=next; $('compare').setAttribute('aria-pressed',String(next)); $('compare').textContent=next?'返回光效':'对比原画'; }
    catch { $('status').textContent='无法连接视频页，请刷新视频页后重试'; }
  };
  // A closed popup/page must never leave comparison latched on.
  window.addEventListener('pagehide',stopCompare);
  window.addEventListener('blur',stopCompare);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopCompare(); });
  root.addEventListener('keydown', e => { if(e.key==='Escape') stopCompare(); });
  $('close').addEventListener('click',stopCompare);
  $('toggle').addEventListener('click',stopCompare);
  for(const key of ['blur','spread','brightness']) {
    const slider=$(key), number=$(`${key}-number`);
    const edit = input => {
      if (input.value === '' || !Number.isFinite(Number(input.value))) { number.value=get()[key]; return; }
      const value=Math.round(Math.max(+slider.min,Math.min(+slider.max,+input.value)));
      number.value=value; if(get()[key]!==value) change({[key]:value},true);
    };
    slider.oninput=()=>edit(slider); slider.onchange=()=>edit(slider);
    number.onchange=()=>edit(number);
    number.onkeydown=e=>{if(e.key==='Enter'){edit(number);number.blur();}};
  }
  $('enabled').onchange=()=>{stopCompare();change({enabled:$('enabled').checked});};
  root.querySelectorAll('[data-preset]').forEach(button=>button.onclick=()=>change(this.presets[button.dataset.preset]));
  $('reset').onclick=()=>{stopCompare();change(this.light(this.defaults));$('status').textContent='已恢复默认光效，可撤销';};
  $('reset-all').onclick=()=>{stopCompare();change({...this.defaults,profiles:get().profiles,lastCustom:get().lastCustom});$('status').textContent='已恢复全部偏好，个人方案已保留';};
  $('undo').onclick=()=>{if(!undo)return;stopCompare();const previous=undo;undo=null;commit(previous);$('undo').disabled=true;$('status').textContent='已撤销';};
  $('last-custom').onclick=()=>{if(get().lastCustom)change(get().lastCustom);};
  $('save-profile').onclick=()=>{
    const name=$('profile-name').value.trim();
    if(!name){$('status').textContent='先为方案起个名字';$('profile-name').focus();return;}
    const profiles=copy(get().profiles), index=profiles.findIndex(p=>p.name===name);
    if(index<0 && profiles.length>=12){$('status').textContent='最多保存 12 个方案，请先删除一个';return;}
    const profile={name,...this.light(get())}; if(index<0)profiles.push(profile);else profiles[index]=profile;
    change({profiles});$('profiles').value=String(index<0?profiles.length-1:index);$('delete-profile').disabled=false;
    $('status').textContent=index<0?'方案已保存':'同名方案已更新，可撤销';
  };
  $('profiles').onchange=()=>{const p=get().profiles[$('profiles').value];if(p){change(this.light(p));$('profile-name').value=p.name;}$('delete-profile').disabled=!p;};
  $('delete-profile').onclick=()=>{const index=$('profiles').value;if(index==='')return;change({profiles:get().profiles.filter((_,i)=>i!==+index)});$('profiles').value='';$('delete-profile').disabled=true;$('status').textContent='方案已删除，可撤销';};
  for(const key of ['quality','position'])$(key).onchange=()=>{change({[key]:$(key).value,...(key==='position'?{anchor:null}:{})});place?.();};
  $('retry').onclick=()=>retry?.();
  $('profile-name').addEventListener('keydown',event=>{if(event.key==='Enter'){$('save-profile').click();event.preventDefault();}});
  return { resetContext(){ stopCompare();undo=null;$('undo').disabled=true;$('profile-name').value='';$('profiles').value=''; }, stopCompare };
};
HaloUI.runtime = function(root, text, retry = false) {
  const status=root.getElementById('runtime-status');
  const short = text.includes('连接已失效') ? '页面连接失效，请刷新' : text.includes('尚未获得') ? '请允许此网站访问权限' : text.includes('无法连接') ? '未连接视频页，刷新后重试' : text.includes('已关闭') ? '已关闭 · 开启后应用参数' : text.includes('正在对比') ? '正在对比原画' : text.includes('设置将用于') ? '请打开所选网站的视频' : text;
  if(status.textContent!==short){status.textContent=short;status.title=text;status.setAttribute('aria-label',text);}
  const button=root.getElementById('retry');
  button.hidden=!retry;
  button.textContent=typeof retry==='string'?retry:'重新采样';
};
HaloUI.place = function(host, settings, video) {
  if(document.body?.dataset.halo==='popup' || document.documentElement.hasAttribute('data-halo-wave'))return;
  if(host.__haloDragAnchor)settings={...settings,anchor:host.__haloDragAnchor};
  const edge=innerWidth<=480?16:24, width=Math.min(336,innerWidth-edge*2);
  const panel=host.shadowRoot?.getElementById('panel');
  if(settings.anchor){
    const button=host.shadowRoot.getElementById('toggle'), bw=button.getBoundingClientRect().width || 84;
    const x=edge+settings.anchor.x*Math.max(0,innerWidth-edge*2-bw), y=edge+settings.anchor.y*Math.max(0,innerHeight-edge*2-40);
    const left=x-width+bw;
    let ph=Math.min(468,innerHeight-edge*2);
    host.dataset.side='right';host.dataset.top='false';
    Object.assign(host.style,{left:`${left}px`,right:'auto',top:`${y}px`,bottom:'auto'});
    let px,py;
    if(innerWidth-edge-x-bw-12>=width || x-edge-12>=width){
      px=innerWidth-edge-x-bw-12>=width?x+bw+12:x-width-12;
      py=Math.max(edge,Math.min(y,innerHeight-edge-ph));
    }else{
      const above=y-edge-10,below=innerHeight-edge-y-50,up=above>=below;
      ph=Math.min(ph,Math.max(0,up?above:below));
      px=Math.max(edge,Math.min(x+bw-width,innerWidth-edge-width));
      py=up?y-ph-10:y+50;
    }
    Object.assign(panel.style,{left:`${px-left}px`,right:'auto',top:`${py-y}px`,bottom:'auto',maxHeight:`${ph}px`});
    return;
  }
  if(panel?.style)for(const property of ['left','right','top','bottom','max-height'])panel.style.removeProperty(property);
  let side=settings.position==='left'?'left':'right',top=false;
  if(settings.position==='auto' && video){
    const r=video.getBoundingClientRect();
    side=r.left>innerWidth-r.right?'left':'right';
    const x=side==='left'?edge:innerWidth-edge-width;
    const panel=host.shadowRoot?.getElementById('panel');
    const height=panel && !panel.hidden?Math.min(panel.getBoundingClientRect().height+50,innerHeight-edge*2):40;
    const overlap=(y)=>Math.max(0,Math.min(x+width,r.right)-Math.max(x,r.left))*Math.max(0,Math.min(y+height,r.bottom)-Math.max(y,r.top));
    top=overlap(edge)<overlap(innerHeight-edge-height);
  }
  host.dataset.side=side;host.dataset.top=String(top);
  host.style.left=side==='left'?`${edge}px`:'auto';host.style.right=side==='right'?`${edge}px`:'auto';
  host.style.top=top?`${edge}px`:'auto';host.style.bottom=top?'auto':`${edge}px`;
};

// Pointer capture keeps dragging stable outside the button. Persist only on release.
HaloUI.bindDrag = function(root,{get,commit,beforeMove}) {
  const button=root.getElementById('toggle'),host=root.host;
  let drag=null,suppressClick=false,clickTimer;
  const anchorAt=(x,y)=>{
    const edge=innerWidth<=480?16:24,bw=button.getBoundingClientRect().width || 84;
    return {x:Math.max(0,Math.min(1,(x-edge)/Math.max(1,innerWidth-edge*2-bw))),y:Math.max(0,Math.min(1,(y-edge)/Math.max(1,innerHeight-edge*2-40)))};
  };
  button.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;}},true);
  button.addEventListener('pointerdown',event=>{
    if(event.button!==0 || !event.isPrimary)return;
    const rect=button.getBoundingClientRect();
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,moved:false};
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove',event=>{
    if(!drag || event.pointerId!==drag.id)return;
    if(!drag.moved && Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<6)return;
    if(!drag.moved){beforeMove();drag.moved=true;button.dataset.dragging='true';}
    event.preventDefault();
    drag.anchor=anchorAt(drag.left+event.clientX-drag.x,drag.top+event.clientY-drag.y);
    host.__haloDragAnchor=drag.anchor;
    HaloUI.place(host,{...get(),anchor:drag.anchor},null);
  });
  const finish=event=>{
    if(!drag || event.pointerId!==drag.id)return;
    const ended=drag;drag=null;delete host.__haloDragAnchor;delete button.dataset.dragging;
    if(ended.moved){
      suppressClick=true;clearTimeout(clickTimer);clickTimer=setTimeout(()=>{suppressClick=false;},350);
      if(event.type==='pointerup')commit(ended.anchor);else HaloUI.place(host,get(),null);
    }
    if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId);
  };
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,finish);
  button.addEventListener('keydown',event=>{
    if(!event.altKey || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();beforeMove();const rect=button.getBoundingClientRect(),step=event.shiftKey?40:10;
    commit(anchorAt(rect.left+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),rect.top+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)));
  });
};
