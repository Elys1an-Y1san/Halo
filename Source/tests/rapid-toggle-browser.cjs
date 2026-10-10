/* Repeated switches with no scrolling, resizing or other UI actions. */
const{chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(process.argv[2]||'.local/tests/immersive');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.HALO_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),results=[];
try{for(const site of ['wave.html','youtube-wave.html']){
 const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto((process.env.HALO_FIXTURE_URL||'http://127.0.0.1:8766/')+site);await page.waitForTimeout(800);
 const data=await page.evaluate(async()=>{
  const host=document.querySelector('#bili-ambient-ui,#halo-youtube-ui'),root=host.shadowRoot,button=root.getElementById('enabled'),layer=document.querySelector('#bili-ambient-layer,#halo-youtube-layer');
  const wait=ms=>new Promise(r=>setTimeout(r,ms));root.getElementById('toggle').click();await wait(260);
  const frames=[],switches=[];let run=true;
  const sample=()=>{const wave=document.querySelector('#halo-page-wave');frames.push({t:performance.now(),radius:wave?Number(wave.dataset.radius):null,target:wave?.dataset.target,hidden:layer.hidden,clip:layer.style.clipPath,mask:!!layer.style.maskImage});if(run)requestAnimationFrame(sample);};sample();
  for(const delay of [35,80,160,320]){
   for(let i=0;i<16;i++){const before=document.querySelector('#halo-page-wave'),radius=before?.dataset.radius;button.click();const after=document.querySelector('#halo-page-wave');switches.push({same:!before||!after||before===after,continuous:!before||!after||radius===after.dataset.radius});await wait(delay);}
   await wait(1250);
  }
  button.click();await wait(1250);const on=!layer.hidden&&!document.querySelector('#halo-page-wave')&&!layer.style.clipPath;
  button.click();await wait(1250);run=false;
  return {frames,switches,on,off:layer.hidden&&!document.querySelector('#halo-page-wave')&&!layer.style.maskImage,restored:document.body.style.backgroundImage===''&&document.documentElement.style.backgroundImage===''};
 });
 const check=(name,pass)=>{results.push({name:site+' '+name,pass:!!pass});assert(pass,name);};
 check('64 reversals never replace the active wave or jump at the input boundary',data.switches.every(s=>s.same&&s.continuous));
 check('live renderer never drops out during an active transition',data.frames.filter(f=>f.target).every(f=>!f.hidden));
 check('running wave never loses its mask',data.frames.filter(f=>f.target&&f.radius>0).every(f=>f.clip&&f.mask));
 check('latest intent settles on then off without leftover paint',data.on&&data.off&&data.restored);
 const steps=data.frames.slice(1).flatMap((f,i)=>{const p=data.frames[i];return Number.isFinite(p.radius)&&Number.isFinite(f.radius)&&f.t-p.t<22?[Math.abs(f.radius-p.radius)]:[];});
 fs.writeFileSync(path.join(out,site.replace('.html','')+'-rapid.json'),JSON.stringify({results,maximumFrameStep:Math.max(...steps),...data}));await page.close();
}}finally{fs.writeFileSync(path.join(out,'rapid-toggle.json'),JSON.stringify(results,null,2));await browser.close();}console.log('PASS',results.length,'rapid toggle checks');})().catch(e=>{console.error(e);process.exitCode=1;});
