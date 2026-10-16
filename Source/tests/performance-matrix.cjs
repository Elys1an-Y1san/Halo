/* Reproducible browser workload, not real-site acceptance.
   HALO_SOURCE_DIR points to a frozen baseline. HALO_MATRIX_SITES=bilibili,youtube,x.
   CPU includes the fixture: compare identical workloads and use operation counts too. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const source = path.resolve(process.env.HALO_SOURCE_DIR || path.join(__dirname, '../src'));
const output = path.resolve(process.argv[2] || '.local/tests/performance-audit/current.json');
const duration = Number(process.env.HALO_MATRIX_DURATION || 1400);
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') {
    const site = url.searchParams.get('site');
    const policy = {bilibili:'bilibili-player',youtube:'youtube-player',x:'x-player'}[site];
    const globalName = {bilibili:'HaloBilibili',youtube:'HaloYouTube',x:'HaloX'}[site];
    res.setHeader('Content-Type','text/html');
    res.end(`<!doctype html><html><head><link rel="stylesheet" href="/styles/${site==='bilibili'?'bilibili':'halo-'+site}.css"><script src="/mock.js"></script><script src="/scripts/halo-ui.js"></script><script src="/scripts/halo-wave.js"></script><script src="/scripts/${policy}.js"></script><script src="/scripts/halo-video.js"></script></head><body style="margin:0;height:20000px"><div id="movie_player" class="bpx-player-container html5-video-player" data-screen="normal" data-testid="videoPlayer" style="width:800px;margin:80px auto"><video muted autoplay playsinline style="width:800px;height:450px;display:block"></video></div><div id="noise"></div><section id="feed" style="position:absolute;top:2500px"></section><script>
    ${globalName}.supports=()=>!location.hash.includes('unsupported');
    const key='${site==='bilibili'?'ambientlight-bilibili-v1':'halo-'+site+'-v1'}';
    localStorage.setItem(key,JSON.stringify({enabled:true,quality:'balanced'}));
    const src=document.createElement('canvas');src.width=640;src.height=360;const ctx=src.getContext('2d');
    window.sourceTimer=setInterval(()=>{ctx.fillStyle='rgb('+Math.round(120+70*Math.sin(performance.now()/400))+',100,170)';ctx.fillRect(0,0,640,360);},16);
    document.querySelector('video').srcObject=src.captureStream(60);document.querySelector('video').play();
    for(let i=0;i<100;i++){const div=document.createElement('div');div.innerHTML='<div><video style="width:240px;height:135px"></video></div>';document.getElementById('feed').append(div);}
    </script><script src="/scripts/halo-engine.js"></script></body></html>`);return;
  }
  const file=url.pathname==='/mock.js'?path.join(__dirname,'ui-fixture/mock.js'):path.join(source,url.pathname);
  if(!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',file.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,executablePath:process.env.HALO_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const report={browser:browser.version(),source,durationMs:duration,sites:{}};
  try{
    for(const site of (process.env.HALO_MATRIX_SITES||'bilibili,youtube,x').split(',')){
      const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
      await page.addInitScript(()=>{
        window.metrics={rects:0,styles:0,scans:0,draws:0,readbacks:0,callbacks:0,writes:0};
        const rect=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(){metrics.rects++;return rect.call(this);};
        const computed=getComputedStyle;window.getComputedStyle=(...a)=>{metrics.styles++;return computed(...a);};
        const query=Document.prototype.querySelectorAll;Document.prototype.querySelectorAll=function(s){if(s==='video')metrics.scans++;return query.call(this,s);};
        const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...a){if(this.canvas.parentElement)metrics.draws++;return draw.apply(this,a);};
        const read=CanvasRenderingContext2D.prototype.getImageData;CanvasRenderingContext2D.prototype.getImageData=function(...a){metrics.readbacks++;return read.apply(this,a);};
        const write=CSSStyleDeclaration.prototype.setProperty;CSSStyleDeclaration.prototype.setProperty=function(...a){metrics.writes++;return write.apply(this,a);};
        const callback=HTMLVideoElement.prototype.requestVideoFrameCallback;
        if(callback)HTMLVideoElement.prototype.requestVideoFrameCallback=function(fn){return callback.call(this,(...a)=>{metrics.callbacks++;fn(...a);});};
      });
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/?site=${site}`);
      await page.waitForFunction(()=>document.querySelector('[id$="-layer"]')?.hidden===false);
      await page.evaluate(()=>{window.ui=document.querySelector('[id$="-ui"]').shadowRoot;window.activeVideo=document.querySelector('video');});
      const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
      const measure=async(name,mode='idle')=>{
        await page.waitForTimeout(180);
        const before=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
        const counts=await page.evaluate(async({duration,mode})=>{
          Object.keys(metrics).forEach(k=>metrics[k]=0);const started=performance.now(),gaps=[];let last=started,n=0;
          await new Promise(resolve=>{const tick=now=>{gaps.push(now-last);last=now;
            if(mode.includes('scroll'))scrollTo(0,n%2?100:0);
            if(mode.includes('noise'))document.getElementById('noise').textContent=String(n);
            if(mode==='slider'){const input=ui.getElementById('brightness');input.value=80+n%80;input.dispatchEvent(new Event('input',{bubbles:true}));}
            n++;if(now-started>=duration)resolve();else requestAnimationFrame(tick);
          };requestAnimationFrame(tick);});
          gaps.sort((a,b)=>a-b);return {...metrics,frames:n,p95GapMs:gaps[Math.floor(gaps.length*.95)]};
        },{duration,mode});
        const after=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
        report.sites[site][name]={...counts,taskMs:(after.TaskDuration-before.TaskDuration)*1000,scriptMs:(after.ScriptDuration-before.ScriptDuration)*1000,layouts:after.LayoutCount-before.LayoutCount,styleRecalcs:after.RecalcStyleCount-before.RecalcStyleCount,heap:after.JSHeapUsedSize};
        console.log(site,name,JSON.stringify(report.sites[site][name]));
      };
      report.sites[site]={};
      await measure('playing');await measure('scrolling','scroll');await measure('comments','noise');
      await page.evaluate(()=>activeVideo.pause());await measure('paused');await measure('pausedComments','noise');await measure('pausedSlider','slider');
      await page.evaluate(()=>{ui.getElementById('enabled').click();return activeVideo.play();});await measure('disabled');await measure('disabledScroll','scroll');
      await page.evaluate(()=>ui.getElementById('enabled').click());
      await measure('slider','slider');
      for(const quality of ['eco','smooth','auto']){await page.evaluate(q=>{const s=ui.getElementById('quality');s.value=q;s.dispatchEvent(new Event('change'));},quality);await measure(quality);}
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await measure('hidden','noise-scroll');
      await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
      if(site==='bilibili'){await page.evaluate(()=>document.getElementById('movie_player').dataset.screen='mini');await measure('mini','noise-scroll');await page.evaluate(()=>document.getElementById('movie_player').dataset.screen='normal');}
      await page.evaluate(()=>{Object.defineProperty(document,'pictureInPictureElement',{configurable:true,value:activeVideo});activeVideo.dispatchEvent(new Event('enterpictureinpicture'));});await measure('pip','noise-scroll');
      await page.evaluate(()=>{delete document.pictureInPictureElement;activeVideo.dispatchEvent(new Event('leavepictureinpicture'));location.hash='unsupported';});await measure('unsupported','noise-scroll');
      assert.equal(errors.length,0,errors.join('\n'));report.sites[site].errors=errors;
      if(process.env.HALO_PERF_ASSERT){
        const r=report.sites[site];assert.equal(r.hidden.rects,0);assert.equal(r.hidden.draws,0);assert.equal(r.paused.draws,0);assert.equal(r.disabled.draws,0);
        assert(r.playing.draws>0&&r.auto.draws>0&&r.smooth.draws>0,'workload must sample live frames');
        assert.equal(r.disabledScroll.draws,0);assert.equal(r.scrolling.layouts,0);assert(r.scrolling.styles<200);assert.equal(r.pip.draws,0);
        assert.equal(r.pausedSlider.draws,0);assert.equal(r.pausedSlider.readbacks,0);
        assert(r.slider.draws<=Math.ceil(duration*30/1000)+3);assert(r.slider.readbacks<=Math.ceil(duration/100)+2);
      }
      await page.close();fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
    }
  }finally{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
