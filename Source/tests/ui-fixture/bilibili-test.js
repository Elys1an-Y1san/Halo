(async()=>{
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const results=[];const check=(name,pass)=>{results.push({name,pass:!!pass});if(!pass)throw Error(name);};
try {
 await sleep(500);
 const deadline=performance.now()+2000;while((document.querySelector('video').readyState<2||document.querySelector('#bili-ambient-layer').hidden)&&performance.now()<deadline)await sleep(25);
 const root=document.querySelector('#bili-ambient-ui').shadowRoot;
 const $=id=>root.getElementById(id);
 $('toggle').click();
 check('Bilibili panel opens',!$('panel').hidden);
 root.querySelector('[data-preset="soft"]').click();await sleep(200);
 check('Bilibili shared visual state',$('mode-label').textContent==='柔和'&&$('blur-value').value==='40');
 check('Bilibili preference saved',JSON.parse(localStorage.getItem('ambientlight-bilibili-v1')).spread===50);
 check('real video sampled',!document.querySelector('#bili-ambient-layer').hidden);
 const layer=document.querySelector('#bili-ambient-layer');const canvas=layer.querySelector('canvas');
 check('renderer tracks blur',canvas.style.filter.includes('blur('));
 $('enabled').click();await sleep(1550);
 check('disabled removes video layer',layer.hidden&&!document.documentElement.hasAttribute('data-bili-ambient'));
 check('disabled updates switch effect state',$('power').dataset.enabled==='false');
 $('reset').click();await sleep(1950);
 check('reset restores renderer',!layer.hidden&&$('mode-label').textContent==='影院');
 $('close').click();await sleep(260);
 check('close returns keyboard focus',root.activeElement===$('toggle')&&$('panel').hidden);
} catch(error){results.push({name:error.message,pass:false});}
document.body.dataset.testResults=JSON.stringify(results);
})();
