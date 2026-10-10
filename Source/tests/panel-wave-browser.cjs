const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const out=path.resolve(process.argv[2]||'.local/tests/panel-wave'),base=process.env.HALO_FIXTURE_URL||'http://127.0.0.1:8766/';fs.mkdirSync(out,{recursive:true});
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.HALO_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),results=[];
const check=(name,pass,data)=>{results.push({name,pass:!!pass,data});assert(pass,name);};
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(base+'wave.html');await page.locator('#toggle').waitFor();
 await page.waitForFunction(()=>document.querySelector('video').readyState>=2&&document.querySelector('#bili-ambient-ui')?.shadowRoot.getElementById('enabled').checked===false);
 await page.locator('#toggle').click();await page.waitForTimeout(250);await page.locator('#enabled').click();
 await page.waitForFunction(()=>document.querySelector('#halo-page-wave'));
 await page.waitForFunction(()=>!document.querySelector('#halo-page-wave'));
 await page.waitForTimeout(1000);
 const glow=await page.evaluate(()=>{const r=document.querySelector('#bili-ambient-ui').shadowRoot,p=r.getElementById('panel'),a=r.getElementById('panel-aura'),b=p.getBoundingClientRect(),g=a.getBoundingClientRect();return {opacity:getComputedStyle(a).opacity,diff:Math.max(...['left','top','width','height'].map(k=>Math.abs(b[k]-g[k]))),overflow:p.scrollWidth-p.clientWidth};});
 check('enabled diffusion is visible and exactly follows the panel border',glow.opacity==='1'&&glow.diff<.1&&glow.overflow===0,glow);
 await page.screenshot({path:path.join(out,'panel-diffusion.png')});
 const timings=await page.evaluate(()=>{const a=JSON.parse(document.body.dataset.waveCost||'[]').sort((a,b)=>a-b);return {samples:a.length,p95:a[Math.floor(a.length*.95)],max:Math.max(...a)};});
 check('wave JavaScript paint fits a 60 Hz frame budget at p95',timings.samples>10&&timings.p95<16.7,timings);
 await page.locator('#enabled').click();await page.waitForTimeout(60);
 check('diffusion fades when light is disabled',Number(await page.locator('#panel-aura').evaluate(e=>getComputedStyle(e).opacity))<1);
 await page.waitForFunction(()=>!document.querySelector('#halo-page-wave'));await page.waitForTimeout(260);
 check('off leaves no residual diffusion',await page.locator('#panel-aura').evaluate(e=>getComputedStyle(e).opacity==='0'));
 await page.evaluate(()=>{const root=document.querySelector('#bili-ambient-ui').shadowRoot;const b=root.getElementById('toggle');b.focus();});
 await page.locator('#toggle').press('Alt+ArrowLeft');await page.locator('#enabled').click();await page.waitForTimeout(1200);
 check('custom-position diffusion follows moved panel',await page.evaluate(()=>{const r=document.querySelector('#bili-ambient-ui').shadowRoot,a=r.getElementById('panel-aura').getBoundingClientRect(),p=r.getElementById('panel').getBoundingClientRect();return ['left','top','width','height'].every(k=>Math.abs(a[k]-p[k])<.1);}));
 await page.evaluate(()=>{
  const holder=document.createElement('div');holder.id='field-sample';holder.style.cssText='position:fixed;left:0;top:0;width:400px;height:450px;z-index:2147483647;background:rgb(16,18,24)';
  const material=document.createElement('div');material.style.cssText='position:absolute;inset:0';
  const f=HaloWave.geometry.field({left:100,top:80,width:200,height:280,corner:24},40,{left:0,top:0,width:400,height:450},'transparent','white',30);
  for(const k of ['image','size','position','repeat'])material.style.setProperty('background-'+k,f[k]);holder.append(material);document.body.append(holder);
 });
 const raster=path.join(out,'transparent-field.png');await page.locator('#field-sample').screenshot({path:raster});
 const pixels=JSON.parse(execFileSync('python3',['-c','import sys,json;from PIL import Image;i=Image.open(sys.argv[1]).convert("RGB");print(json.dumps([i.getpixel(p) for p in [(200,200),(10,10),(200,44),(62,200),(90,200),(310,200),(338,200)]]))',raster],{encoding:'utf8'}));
 check('transparent inner material reveals underlying page instead of a white strip',pixels[0][0]===16&&pixels[0][1]===18&&pixels[1][0]===255,pixels);
 check('feathered straight edges meet the same underlying material on both sides',Math.abs(pixels[4][0]-pixels[5][0])<10&&pixels[3][0]>pixels[4][0]&&pixels[6][0]>pixels[5][0],pixels);
 await page.close();
 const freeze=await browser.newPage({viewport:{width:1440,height:1000}});await freeze.goto(base+'wave.html?auto&freeze=90');await freeze.waitForFunction(()=>document.body.dataset.waveHeld==='true');await freeze.screenshot({path:path.join(out,'rounded-wave.png')});
 check('wave exposes panel geometry for exact border continuity',await freeze.evaluate(()=>{const w=document.querySelector('#halo-page-wave'),p=document.querySelector('#bili-ambient-ui').shadowRoot.getElementById('panel').getBoundingClientRect();return w.dataset.shape==='rounded-rect'&&Number(w.dataset.width)===p.width&&Number(w.dataset.height)===p.height;}));
 check('nested transparent page containers do not stack duplicate reveal backgrounds',await freeze.evaluate(()=>[document.body,document.getElementById('app')].every(e=>e.style.backgroundColor==='transparent'&&e.style.backgroundImage==='none')));
 await freeze.close();
}finally{fs.writeFileSync(path.join(out,'targeted.json'),JSON.stringify(results,null,2));await browser.close();}
console.log('PASS',results.length,'panel wave checks');
})().catch(e=>{console.error(e);process.exitCode=1;});
