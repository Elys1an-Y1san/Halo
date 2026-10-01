const edge=new URLSearchParams(location.search).get('edge');if(edge)(async()=>{
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),results=[];
const check=(name,pass)=>{results.push({name,pass:!!pass});if(!pass)throw Error(name);};
try{
await sleep(650);const s=document.getElementById('bili-ambient-ui').shadowRoot,$=id=>s.getElementById(id),layer=document.getElementById('bili-ambient-layer');$('toggle').click();await sleep(300);$('enabled').click();
if(edge==='reduced'){await sleep(60);check('reduced-motion skips page optics',!document.getElementById('halo-page-wave'));check('reduced-motion still applies real renderer',!layer.hidden);$('enabled').click();await sleep(30);check('reduced-motion disables immediately',layer.hidden);}
if(edge==='missing'){await sleep(200);check('missing video waits without false reveal',document.documentElement.getAttribute('data-halo-wave')==='waiting'&&layer.hidden);await sleep(1450);check('readiness timeout clears wave',!document.getElementById('halo-page-wave'));check('timeout restores page material',document.body.style.backgroundImage===''&&document.getElementById('app').style.backgroundImage==='');}
if(edge==='waiting-reverse'){await sleep(40);$('enabled').click();await sleep(30);check('reverse before readiness cancels wave',!document.getElementById('halo-page-wave'));check('reverse before readiness leaves renderer off',layer.hidden&&!document.documentElement.hasAttribute('data-bili-ambient'));check('cancel leaves no transient page styles',document.body.style.backgroundImage===''&&document.querySelector('.video-info-title').style.webkitTextFillColor==='');}
}catch(error){results.push({name:error.message,pass:false});}document.body.dataset.edgeResults=JSON.stringify(results);
})();
