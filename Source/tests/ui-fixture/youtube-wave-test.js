if(new URLSearchParams(location.search).has('test'))(async()=>{
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const results=[];
const check=(name,pass)=>{results.push({name,pass:!!pass});if(!pass)throw Error(name);};
try{
 await sleep(650);const s=document.getElementById('halo-youtube-ui').shadowRoot,$=id=>s.getElementById(id);$('toggle').click();await sleep(300);$('enabled').click();
 await sleep(30);check('bridge waits for renderer readiness',document.documentElement.getAttribute('data-halo-wave')==='waiting');
 await sleep(190);const w=document.getElementById('halo-page-wave');check('bridge starts wave after acknowledgement',w&&Number(w.dataset.radius)>0);
 check('live core renderer clipped',getComputedStyle(coreLayer).clipPath.startsWith('circle('));
 check('theme background reveals spatially',document.getElementById('app').style.backgroundImage.includes('radial-gradient'));
 const rendererFrame=document.body.dataset.rendererFrame,deadline=performance.now()+1200;while(document.body.dataset.rendererFrame===rendererFrame&&performance.now()<deadline)await sleep(25);check('core video renderer stays live',document.body.dataset.rendererFrame!==rendererFrame);
 const app=document.getElementById('app');app.style.setProperty('color','rgb(30, 90, 140)','important');window.dispatchEvent(new Event('resize'));await sleep(20);
 check('cleanup preserves newer site inline style',app.style.color==='rgb(30, 90, 140)'&&app.style.getPropertyPriority('color')==='important');
 check('activation cleanup restores live layer',coreLayer.style.clipPath===''&&!coreLayer.hidden&&!document.getElementById('halo-page-wave'));
 let finalMaskHeld=false;const exitObserver=new MutationObserver(()=>{if(document.getElementById('setting-enabled').getAttribute('aria-checked')==='false'&&document.documentElement.hasAttribute('data-ambientlight-enabled'))finalMaskHeld=coreLayer.style.clipPath.startsWith('circle(0px');});exitObserver.observe(document.getElementById('setting-enabled'),{attributes:true,attributeFilter:['aria-checked']});
 $('enabled').click();await sleep(220);check('off keeps core active until frontier completes',document.getElementById('setting-enabled').getAttribute('aria-checked')==='true'&&!coreLayer.hidden);
 await sleep(1600);check('off is acknowledged by injected core',coreLayer.hidden&&!document.documentElement.hasAttribute('data-ambientlight-enabled')&&!document.documentElement.hasAttribute('dark'));
 check('zero mask held during async disable acknowledgement',finalMaskHeld);exitObserver.disconnect();
 check('no transient page styles remain',document.body.style.backgroundImage===''&&document.querySelector('.video-info-title').style.webkitTextFillColor==='');
}catch(error){results.push({name:error.message,pass:false});}
document.body.dataset.waveResults=JSON.stringify(results);
})();
