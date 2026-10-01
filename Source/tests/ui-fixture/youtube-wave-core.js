// Local bridge simulator: delayed injected-theme acknowledgement plus a live video renderer.
const coreLayer=document.createElement('div');coreLayer.className='ambientlight__container';coreLayer.hidden=true;
const coreCanvas=document.createElement('canvas');coreCanvas.width=320;coreCanvas.height=180;coreLayer.append(coreCanvas);document.body.prepend(coreLayer);
const coreContext=coreCanvas.getContext('2d');
const coreDraw=()=>{const v=document.querySelector('video');if(!coreLayer.hidden&&v.readyState>=2){coreContext.drawImage(v,0,0,320,180);document.body.dataset.rendererFrame=String(v.currentTime);}requestAnimationFrame(coreDraw);};requestAnimationFrame(coreDraw);
let coreToken=0;
document.getElementById('setting-enabled').onclick=e=>{const target=e.target.getAttribute('aria-checked')!=='true',token=++coreToken;e.target.setAttribute('aria-checked',String(target));setTimeout(()=>{if(token!==coreToken)return;document.documentElement.toggleAttribute('data-ambientlight-enabled',target);document.documentElement.toggleAttribute('dark',target);coreLayer.hidden=!target;},120);};
