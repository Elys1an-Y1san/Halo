if(new URLSearchParams(location.search).has('test'))(async()=>{
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const results=[];
const check=(name,pass)=>{results.push({name,pass:!!pass});if(!pass)throw Error(name);};
try{
 await sleep(650);const shadow=document.getElementById('bili-ambient-ui').shadowRoot;const $=id=>shadow.getElementById(id);
 $('toggle').click();await sleep(300);const expectedOrigin=$('panel').getBoundingClientRect();const beforeTime=document.querySelector('video').currentTime;
 $('enabled').click();await sleep(220);
 const wave=document.getElementById('halo-page-wave'),layer=document.getElementById('bili-ambient-layer');
 check('page-wide wave exists',!!wave);
 const trigger=expectedOrigin;
 check('wave begins at the full panel outline',Math.abs(Number(wave.dataset.originX)-(trigger.left+trigger.width/2))<1&&Math.abs(Number(wave.dataset.originY)-(trigger.top+trigger.height/2))<1);
 check('renderer has a real rounded rectangle clip',getComputedStyle(layer).clipPath.startsWith('inset(')&&Number(wave.dataset.radius)>0);
 check('live renderer has feathered reveal',getComputedStyle(layer).maskImage.includes('radial-gradient'));
 check('text glyphs change spatially',document.querySelector('.video-info-title').style.backgroundImage.includes('radial-gradient')&&document.querySelector('.video-info-title').style.webkitTextFillColor==='transparent');
 check('page material changes spatially without duplicate container paint',document.documentElement.style.backgroundImage.includes('radial-gradient')&&document.getElementById('app').style.backgroundColor==='transparent');
 check('wave matches panel dimensions and corner radius',Number(wave.dataset.width)===trigger.width&&Number(wave.dataset.height)===trigger.height&&Number(wave.dataset.corner)===parseFloat(getComputedStyle($('panel')).borderTopLeftRadius));
 const firstRadius=Number(wave.dataset.radius),frame=document.body.dataset.sourceFrame;
 await sleep(250);
 check('wavefront advances',Number(wave.dataset.radius)>firstRadius);
 check('video stays live',document.querySelector('video').currentTime>beforeTime&&document.body.dataset.sourceFrame!==frame);
 check('wave never intercepts clicks',getComputedStyle(wave).pointerEvents==='none');
 $('enabled').click();await sleep(100);
 check('reverse reuses one wave',document.querySelectorAll('#halo-page-wave').length===1&&document.getElementById('halo-page-wave')===wave);
 check('renderer remains active during exit',!layer.hidden);
 await sleep(1300);
 check('exit removes all transient elements',!document.getElementById('halo-page-wave')&&!document.documentElement.hasAttribute('data-halo-wave'));
 check('exit restores renderer off',layer.hidden&&!document.documentElement.hasAttribute('data-bili-ambient'));
 check('original inline material restored',document.getElementById('app').style.backgroundImage==='');
 $('enabled').click();await sleep(2050);
 check('persistent diffusion follows the panel outline',getComputedStyle($('panel-aura')).opacity==='1'&&Math.abs($('panel-aura').getBoundingClientRect().top-$('panel').getBoundingClientRect().top)<1&&$('panel-aura').getBoundingClientRect().width===$('panel').getBoundingClientRect().width);
 check('full activation finishes',!layer.hidden&&!document.getElementById('halo-page-wave'));
 check('renderer clip and masks restored',layer.style.clipPath===''&&layer.style.maskImage==='');
 check('no leftover page material overrides',document.body.style.backgroundImage===''&&document.documentElement.style.backgroundImage==='');
 $('enabled').click();await sleep(140);window.dispatchEvent(new Event('resize'));await sleep(50);
 check('resize settles requested state',layer.hidden&&!document.getElementById('halo-page-wave'));
}catch(error){results.push({name:error.message,pass:false});}
document.body.dataset.waveResults=JSON.stringify(results);
})();
