// Test-only defaults and deterministic phase capture; production scripts are untouched.
localStorage.setItem('ambientlight-bilibili-v1',JSON.stringify({enabled:false,blur:60,spread:100,brightness:100}));
const freezeRadius=Number(new URLSearchParams(location.search).get('freeze'));
const nativeWaveRAF=window.requestAnimationFrame.bind(window);let waveLastTime=0,waveTimings=[];
window.requestAnimationFrame=callback=>nativeWaveRAF(now=>{
 if(callback.name==='tick'){
  const wave=document.getElementById('halo-page-wave'),radius=Number(wave?.dataset.radius),x=Number(wave?.dataset.originX),y=Number(wave?.dataset.originY);
  const reach=Math.max(...[[0,0],[innerWidth,0],[0,innerHeight],[innerWidth,innerHeight]].map(([a,b])=>Math.hypot(a-x,b-y)))+36;
  if(freezeRadius>0&&radius>=(freezeRadius<=1?freezeRadius*reach:freezeRadius)&&!document.body.dataset.waveHeld){document.body.dataset.waveHeld='true';return;}
  if(document.documentElement.getAttribute('data-halo-wave')==='running'&&waveLastTime)waveTimings.push(now-waveLastTime);else waveTimings=[];
  waveLastTime=now;document.body.dataset.waveTiming=JSON.stringify(waveTimings);
 }
 const started=performance.now();callback(now);
 if(callback.name==='tick'){
  window.captureTailFrame?.(performance.now()-started);
  const samples=JSON.parse(document.body.dataset.waveCost || '[]');samples.push(performance.now()-started);
  document.body.dataset.waveCost=JSON.stringify(samples);
 }
});
if(new URLSearchParams(location.search).get('edge')==='reduced'){const nativeMedia=window.matchMedia.bind(window);window.matchMedia=query=>query==='(prefers-reduced-motion: reduce)'?{matches:true,addEventListener(){}}:nativeMedia(query);}
