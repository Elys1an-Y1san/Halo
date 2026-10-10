/* A full-viewport, non-modal first-run experience over the user's actual page. No duplicate video or demo renderer. */
(() => {
  'use strict';
  const key='halo-onboarding-v1';
  globalThis.HaloOnboarding={create({api,shadow,host,ready,compare,enabled,open,enable}){
    const style=document.createElement('style');
    style.textContent=`
#guide{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;margin:0;padding:0;border:0;border-radius:0;overflow:hidden;pointer-events:none;background:transparent;color:#fff;text-align:center;isolation:isolate;opacity:1;transition:opacity 250ms var(--ease)}
#guide[data-state=closed]{opacity:0;pointer-events:none}
#guide:before{content:"";position:absolute;inset:0;z-index:-2;background:linear-gradient(180deg,#06091078,#070b1099 50%,#080b12c9);pointer-events:none;transition:opacity 250ms var(--ease)}
#guide .guide-atmosphere{position:absolute;inset:0;overflow:clip;contain:strict;z-index:-1;pointer-events:none;opacity:1;transition:opacity 250ms var(--ease)}
#guide .guide-light{position:absolute;inset:-25%;z-index:-1;pointer-events:none;opacity:.8;transform:translate3d(0,0,0);background:radial-gradient(ellipse at 12% 75%,#eebc786e,transparent 42%),radial-gradient(ellipse at 82% 28%,#91c3d166,transparent 44%),radial-gradient(ellipse at 60% 105%,#e5ad5d66,transparent 48%);animation:guide-light-arrive 4200ms var(--ease) both}
#guide .guide-light-back{background:radial-gradient(ellipse at 48% 80%,#ffe2a833,transparent 44%);animation:guide-light-rise 6200ms var(--ease) both}
@keyframes guide-light-arrive{from{opacity:0;transform:translate3d(-12%,18%,0) scale(.95)}to{opacity:.8;transform:translate3d(0,0,0) scale(1.08)}}
@keyframes guide-light-rise{from{opacity:0;transform:translate3d(0,35%,0)}to{opacity:1;transform:translate3d(0,-8%,0)}}
#guide .guide-top{position:absolute;top:24px;right:32px;pointer-events:none}
#guide .guide-stage{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(680px,calc(100vw - 48px));display:flex;flex-direction:column;align-items:center;gap:0;text-align:center}
#guide-logo{display:block;flex:none;width:72px;height:72px;margin:0 auto 20px;object-fit:contain}
#guide #guide-step{margin:0 0 20px;color:#f7d7a6;font-size:12px;line-height:1.4;letter-spacing:.08em}
#guide h2{display:block;width:100%;height:auto;font-size:clamp(36px,4.3vw,64px);line-height:1.2;font-weight:500;letter-spacing:-.035em;margin:0;text-align:center;color:#fff;perspective:900px}
#guide .guide-line{display:block;width:100%;white-space:nowrap;text-align:center}#guide .guide-letter{display:inline-block;overflow:hidden;vertical-align:bottom;padding:.12em .025em;margin:-.12em -.025em}
#guide .guide-glyph{display:inline-block;transform-origin:50% 100%}
#guide p{width:100%;font-size:14px;line-height:1.8;margin:22px 0 0;color:#e1e5e9;max-width:32em;text-wrap:balance;text-align:center}
#guide .guide-actions{display:flex;align-items:center;justify-content:center;gap:28px;margin-top:28px;max-width:100%;flex-wrap:wrap}
#guide button{pointer-events:auto;min-height:44px;padding:8px 4px;border:0;border-radius:0;background:transparent;color:inherit;transition:opacity 150ms var(--ease);font-size:13px;font-weight:500}
#guide-next{border-bottom:1px solid #f9dfb588!important;color:#f9dfb5!important}#guide-skip{color:#d3d7df!important}#guide-compare{color:#fff!important;border-bottom:1px solid #ffffff60!important}
#guide-note:empty{display:none}#guide-note{font-size:12px!important}
#brightness[data-guided]{outline:2px solid #f3c780;outline-offset:2px;border-radius:8px}
#guide[data-step="1"]:before{opacity:.22}#guide[data-step="1"] .guide-atmosphere{opacity:0}
#guide[data-step="1"] .guide-stage{text-shadow:0 2px 12px #000c}
#guide[data-step="2"]:before{opacity:1;background:linear-gradient(to bottom,#0b0e16ee,#0b0e16aa 180px,transparent 300px)}#guide[data-step="2"] .guide-atmosphere{opacity:0}
#guide[data-step="2"] .guide-stage{top:6vh;transform:translateX(-50%);text-shadow:0 2px 12px #000c}
#guide[data-step="2"] #guide-logo{width:36px;height:36px;margin-bottom:12px}
#guide[data-step="2"] #guide-step{margin-bottom:8px}#guide[data-step="2"] h2{font-size:24px}
#guide[data-step="2"] p{margin-top:12px;font-size:13px}#guide[data-step="2"] .guide-actions{display:none}
#guide[data-step="2"] .guide-top{top:auto;bottom:20px;right:124px}
#guide[data-keyboard=true]{transition:none}#guide[data-keyboard=true] button{scale:1}
#guide[data-comparing=true] .guide-atmosphere{opacity:0}#guide[data-comparing=true]:before{opacity:.15}
@media(prefers-reduced-motion:reduce){#guide{transition:opacity 150ms var(--ease)}#guide .guide-light{animation:none;transform:none;opacity:.55}}
@media(prefers-reduced-transparency:reduce){#guide:before{background:#151a20}#guide .guide-light{opacity:.3}}
@media(max-width:600px){#guide .guide-top{top:14px;right:20px}#guide h2{font-size:clamp(28px,7.5vw,42px)}#guide-logo{width:60px;height:60px;margin-bottom:16px}#guide .guide-stage{width:calc(100vw - 40px)}#guide .guide-actions{gap:20px;margin-top:24px}#guide p{font-size:13px}#guide[data-step="2"] .guide-stage{top:20px}#guide[data-step="2"] h2{font-size:18px}}
@media(max-height:620px){#guide-logo{width:40px;height:40px;margin-bottom:10px}#guide #guide-step{margin-bottom:10px}#guide h2{font-size:32px}#guide p{margin-top:12px;font-size:12px}#guide .guide-actions{margin-top:14px}#guide[data-step="2"] .guide-stage{display:none}}

`;
    const card=document.createElement('aside');card.id='guide';card.hidden=true;card.inert=true;
    card.setAttribute('aria-label','映光使用引导');
    card.innerHTML='<div class="guide-atmosphere" aria-hidden="true"><div class="guide-light" aria-hidden="true"></div><div class="guide-light guide-light-back" aria-hidden="true"></div></div><div class="guide-top"><button id="guide-skip" type="button">跳过</button></div><div class="guide-stage"><img id="guide-logo" width="72" height="72" alt="映光 Halo"><p id="guide-step"></p><h2 id="guide-title"></h2><p id="guide-body"></p><div class="guide-actions"><button id="guide-compare" type="button" aria-pressed="false">显示环境光</button><button id="guide-next" type="button">开始体验</button></div><p id="guide-note" role="status" aria-live="polite"></p></div>';
    card.querySelector('#guide-logo').src=api.runtime.getURL?.('images/icon-128.png')||'images/icon-128.png';
    shadow.append(style,card);
    const $=id=>card.querySelector('#'+id);
    let pending=false,claimed=false,requestFocus=false,visible=false,finished=false,claiming=false,step=0,exitTimer,compareTimer,comparing=false,titleRevision=0,adjusted=false;
    const motions=new Set(),reduce=matchMedia('(prefers-reduced-motion:reduce)');
    const motion=(element,frames,options)=>{const a=element.animate(frames,options);motions.add(a);a.finished.then(()=>{if(options.fill!=='forwards'){motions.delete(a);a.cancel();}},()=>motions.delete(a));return a;};
    const stopMotion=()=>{++titleRevision;for(const a of motions){try{a.commitStyles();}catch{/* Detached animations have nothing to preserve. */}a.cancel();}motions.clear();};
    const stopCompare=()=>{card.dataset.comparing='false';if(comparing)compare(false,card.dataset.keyboard!=='true' && !matchMedia('(prefers-reduced-motion:reduce)').matches);comparing=false;clearTimeout(compareTimer);$('guide-compare').setAttribute('aria-pressed','false');$('guide-compare').textContent='隐藏环境光';};
    const hide=(animate=true)=>{
      visible=false;stopMotion();shadow.getElementById('brightness').removeAttribute('data-guided');if(step===2)shadow.getElementById('status').textContent='';stopCompare();card.inert=true;card.dataset.state='closed';clearTimeout(exitTimer);
      if(animate)exitTimer=setTimeout(()=>{card.hidden=true;},260);else card.hidden=true;
    };
    const setTitle=text=>{
      const heading=$('guide-title');if(heading.getAttribute('aria-label')===text.replace('\n',''))return;
      const revision=++titleRevision,animated=visible&&!reduce.matches&&card.dataset.keyboard!=='true';
      const build=()=>{
        if(revision!==titleRevision||!visible)return;
        for(const a of motions)a.cancel();motions.clear();heading.replaceChildren();heading.setAttribute('aria-label',text.replace('\n',''));
        let index=0;
        for(const line of text.split('\n')){
          const row=document.createElement('span');row.className='guide-line';row.setAttribute('aria-hidden','true');heading.append(row);
          for(const letter of Array.from(line)){
            const cell=document.createElement('span'),glyph=document.createElement('span');cell.className='guide-letter';glyph.className='guide-glyph';glyph.textContent=letter;cell.append(glyph);row.append(cell);
            if(animated)motion(glyph,[{transform:'translate3d(0,110%,0) rotateX(-35deg)',opacity:0},{transform:'translate3d(0,0,0) rotateX(0)',opacity:1}],{duration:720,delay:index*40,easing:'cubic-bezier(.23,1,.32,1)',fill:'backwards'});index++;
          }
        }
      };
      const old=[...heading.querySelectorAll('.guide-glyph')];
      if(animated&&old.length){
        const exits=old.map((e,i)=>motion(e,[{transform:getComputedStyle(e).transform,opacity:getComputedStyle(e).opacity},{transform:'translate3d(0,-110%,0) rotateX(25deg)',opacity:0}],{duration:280,delay:i*18,easing:'cubic-bezier(.23,1,.32,1)',fill:'forwards'}));
        Promise.all(exits.map(a=>a.finished.catch(()=>{}))).then(build);
      }else build();
    };
    const render=()=>{
      card.dataset.step=String(step);
      $('guide-step').textContent=['1 / 3 · 认识映光','2 / 3 · 对比效果','3 / 3 · 调整亮度'][step];
      setTitle(['把视频的颜色，\n延伸到页面。','亲眼看看，\n环境光的区别。','拖动「亮度」，调整光强。'][step]);
      $('guide-body').textContent=step===0?'映光会跟随视频颜色，为画面周围添加柔和光晕。接下来，试着对比和调节亮度。':step===1?(enabled()?'点击下方按钮，对比视频周围的光线。视频画面和已保存的设置不会改变。':'环境光当前关闭。点击「开启环境光」，在这个视频上试一试。'):(adjusted?`亮度已设为 ${shadow.getElementById('brightness').value}%。设置会自动保存。`:enabled()?'向右更亮，向左更暗。也可以选择「柔和」预设，设置会自动保存。':'先打开面板顶部的环境光开关，再拖动「亮度」滑块。');
      $('guide-note').textContent=step===1?(enabled()?(comparing?'当前：原画':'当前：环境光'):'环境光尚未开启'):'';
      $('guide-next').textContent=step===0?'开始体验':step===1?'去调整亮度':'完成';
      $('guide-next').hidden=step===2;
      $('guide-skip').textContent=step===2?'完成引导':'跳过';
      $('guide-compare').hidden=step!==1;
      $('guide-compare').textContent=!enabled()?'开启环境光':comparing?'显示环境光':'隐藏环境光';
      shadow.getElementById('brightness').toggleAttribute('data-guided',step===2);
      if(step===2)shadow.getElementById('status').textContent=adjusted?'亮度已调整，设置会自动保存':'拖动亮度滑块，观察光线变化';
    };
    const show=()=>{
      if(finished || !ready())return;
      clearTimeout(exitTimer);visible=true;card.hidden=false;card.inert=false;card.dataset.state='closed';$('guide-title').removeAttribute('aria-label');$('guide-title').replaceChildren();render();
      card.getBoundingClientRect();card.dataset.state='open';
      if(requestFocus){$('guide-next').focus({preventScroll:true});requestFocus=false;}
    };
    const dismiss=()=>{
      if(!visible && !pending)return;
      const focused=card.contains(shadow.activeElement);finished=true;pending=false;hide();
      if(focused && !host.hidden)shadow.getElementById('toggle').focus({preventScroll:true});
      api.storage.local.set({[key]:{completedAt:Date.now()}}).catch(()=>{});
    };
    const sync=()=>{
      if(finished)return;
      if(!ready()){if(visible)hide(false);return;}
      if(visible)return;
      if(claimed){show();return;}
      if(!pending || claiming)return;
      claiming=true;
      api.runtime.sendMessage({type:'halo-guide-claim'}).then(result=>{
        pending=false;if(result?.ok){claimed=true;show();}
      },()=>{pending=false;}).finally(()=>{claiming=false;});
    };
    card.addEventListener('keydown',event=>{card.dataset.keyboard='true';if(event.key==='Escape'){event.stopPropagation();event.preventDefault();dismiss();}});
    document.addEventListener('keydown',event=>{if(event.key==='Escape' && !event.isComposing && visible){card.dataset.keyboard='true';dismiss();}});
    reduce.addEventListener('change',()=>{stopMotion();if(visible){$('guide-title').removeAttribute('aria-label');render();}});
    card.addEventListener('pointerdown',()=>{card.dataset.keyboard='false';});
    $('guide-skip').onclick=dismiss;
    $('guide-next').onclick=()=>{
      stopCompare();
      if(step===0){step=1;compare(true,!reduce.matches&&card.dataset.keyboard!=='true');comparing=true;card.dataset.comparing='true';$('guide-compare').setAttribute('aria-pressed','true');render();}
      else if(step===1){step=2;render();open(true);}
      else dismiss();
    };
    $('guide-compare').onclick=()=>{
      if(!enabled()){enable();stopCompare();render();return;}
      if(comparing){stopCompare();render();return;}
      card.dataset.comparing='true';comparing=true;compare(true,card.dataset.keyboard!=='true'&&!reduce.matches);$('guide-compare').setAttribute('aria-pressed','true');render();
    };
    shadow.addEventListener('input',event=>{if(visible&&step===2&&['brightness','brightness-number'].includes(event.target.id)){adjusted=true;render();}});
    shadow.addEventListener('change',()=>{if(visible&&step===2)render();});
    shadow.getElementById('close').addEventListener('click',()=>{if(step===2)dismiss();});
    return {
      async init(){try {pending=!!(await api.storage.local.get(key))[key]?.pending;}catch {pending=false;}},
      sync,
      get controlsActive(){return !finished&&step===2;},
      dismiss,
      replay(){hide(false);finished=false;claimed=true;requestFocus=true;step=0;adjusted=false;card.dataset.keyboard='false';sync();},
      suspend(){hide(false);},
    };
  }};
})();
