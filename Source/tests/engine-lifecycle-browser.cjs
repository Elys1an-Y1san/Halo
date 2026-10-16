/* Observer lifetime, suspended work and recovery. Uses local generated video. */
const {chromium}=require('playwright');const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.HALO_FIXTURE_URL||'http://127.0.0.1:8766/';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.HALO_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const checks=[];
const check=(name,value)=>{checks.push({name,pass:!!value});assert(value,name);};
try{const p=await browser.newPage({viewport:{width:1440,height:900}});await p.route('**/bilibili-mini-test.js',r=>r.fulfill({body:''}));
await p.addInitScript(()=>{
 window.observedVideos=0;const IO=IntersectionObserver;
 window.IntersectionObserver=class extends IO{constructor(...a){super(...a);this.targets=new Set();}observe(t){if(!this.targets.has(t)){this.targets.add(t);observedVideos++;}super.observe(t);}unobserve(t){if(this.targets.delete(t))observedVideos--;super.unobserve(t);}disconnect(){observedVideos-=this.targets.size;this.targets.clear();super.disconnect();}};
 window.samples=0;const draw=CanvasRenderingContext2D.prototype.drawImage;
 CanvasRenderingContext2D.prototype.drawImage=function(...a){if(this.canvas.closest('#bili-ambient-layer')){samples++;if(window.failSampling)throw new DOMException('test blocked read','SecurityError');}return draw.apply(this,a);};
});
await p.goto(base+'bilibili-mini.html');await p.waitForFunction(()=>document.getElementById('bili-ambient-layer')?.hidden===false);
await p.evaluate(()=>{window.video=document.querySelector('video');window.ui=document.getElementById('bili-ambient-ui').shadowRoot;const feed=document.createElement('div');feed.id='many-videos';feed.style.cssText='position:absolute;top:5000px';feed.innerHTML='<video style="width:100px;height:100px"></video>'.repeat(100);document.body.append(feed);});
await p.waitForFunction(()=>observedVideos===101);check('all candidates receive visibility observation',true);
await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));document.getElementById('many-videos').remove();samples=0;});await p.waitForTimeout(900);
check('hidden document does not sample',await p.evaluate(()=>samples===0));
await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await p.waitForFunction(()=>observedVideos===1&&samples>0);
check('return rescans hidden DOM changes and releases removed videos',true);
await p.evaluate(()=>{HaloBilibili.supports=url=>url.hash!=='#unsupported';location.hash='unsupported';});await p.waitForFunction(()=>observedVideos===0);
check('unsupported SPA route releases all candidate observers',true);
await p.evaluate(()=>{location.hash='supported';});await p.waitForFunction(()=>observedVideos===1&&!document.getElementById('bili-ambient-layer').hidden);
check('returning SPA route restores rendering',true);
await p.evaluate(()=>{document.body.classList.add('webscreen-fix');samples=0;});await p.waitForTimeout(350);
check('CSS web fullscreen suspends invisible ambient sampling',await p.evaluate(()=>samples===0));
await p.evaluate(()=>document.body.classList.remove('webscreen-fix'));await p.waitForFunction(()=>samples>0);
check('leaving CSS web fullscreen resumes sampling',true);
for(const [prop,event] of [['fullscreenElement','fullscreenchange'],['pictureInPictureElement','enterpictureinpicture']]){
 await p.evaluate(({prop,event})=>{Object.defineProperty(document,prop,{configurable:true,value:video});(event==='fullscreenchange'?document:video).dispatchEvent(new Event(event));samples=0;},{prop,event});await p.waitForTimeout(350);check(prop+' suspends sampling',await p.evaluate(()=>samples===0));
 await p.evaluate(({prop,event})=>{delete document[prop];(event==='fullscreenchange'?document:video).dispatchEvent(new Event(event==='fullscreenchange'?event:'leavepictureinpicture'));},{prop,event});await p.waitForFunction(()=>samples>0);
}
await p.evaluate(()=>{window.failSampling=true;});await p.waitForFunction(()=>ui.getElementById('retry').hidden===false);const failed=await p.evaluate(()=>samples);await p.waitForTimeout(900);check('failed source stops repeated drawing attempts',await p.evaluate(n=>samples===n,failed));
await p.evaluate(()=>{window.failSampling=false;ui.getElementById('retry').click();});await p.waitForFunction(n=>samples>n&&!document.getElementById('bili-ambient-layer').hidden,failed);check('explicit retry restores sampling',true);
await p.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));const suspended=await p.evaluate(()=>samples);await p.waitForTimeout(300);check('page cache suspension cancels sampling',await p.evaluate(n=>samples===n,suspended));
await p.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await p.waitForFunction(n=>samples>n,suspended);check('page cache restoration resumes sampling',true);
}finally{const out=path.resolve(process.argv[2]||'.local/tests/performance-audit/lifecycle.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(checks,null,2)+'\n');console.log(checks);await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
