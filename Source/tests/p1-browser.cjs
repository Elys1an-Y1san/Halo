/* Real Canvas/video/UI checks; extension messaging and load pressure are injected.
   Run against tests/ui-fixture/serve.py. Never represents real-site acceptance. */
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const base=process.env.HALO_FIXTURE_URL||'http://127.0.0.1:8765/';
const output=path.resolve(process.argv[2]||path.join(__dirname,'../.build/p1'));
const results=[];
const check=(name,pass,detail)=>{results.push({name,pass:!!pass,...(detail===undefined?{}:{detail})});assert(pass,name);};
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.HALO_CHROME_PATH?{executablePath:process.env.HALO_CHROME_PATH}:{})});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'panel.html');
  await page.waitForFunction(()=>document.querySelector('#halo-youtube-layer')?.hidden===false);
  const pixelResults=await page.evaluate(()=>{
   const source=document.createElement('canvas');source.width=320;source.height=180;
   const out=document.createElement('canvas');out.width=320;out.height=180;
   const s=source.getContext('2d'),ctx=out.getContext('2d',{alpha:false});
   const fill=color=>{s.fillStyle=color;s.fillRect(0,0,320,180);};
   const processor=HaloVideo.createLightProcessor(),pixel=()=>Array.from(ctx.getImageData(100,100,1,1).data);
   fill('red');processor.draw(ctx,source,0,100,true);
   fill('blue');processor.draw(ctx,source,33,100);const blended=pixel();
   for(let now=66;now<=660;now+=33)processor.draw(ctx,source,now,100);
   const settled=pixel();
   fill('black');for(let now=693;now<=1023;now+=33)processor.draw(ctx,source,now,100);
   const darkGain=Number(out.style.getPropertyValue('--halo-tone'));
   fill('white');processor.reset();processor.draw(ctx,source,1100,180,true);
   const brightGain=Number(out.style.getPropertyValue('--halo-tone'));
   out.style.filter=HaloVideo.geometry({width:320,height:180,left:0,top:0},320,180,{blur:0,spread:0,brightness:180}).style.filter;
   document.body.append(out);const brightFilter=getComputedStyle(out).filter;out.remove();
   fill('red');processor.reset();processor.draw(ctx,source,1150,100,true);const reset=pixel();
   const timings=[];for(let i=0;i<120;i++){const start=performance.now();processor.draw(ctx,source,1200+i*34,100);timings.push(performance.now()-start);}
   timings.sort((a,b)=>a-b);
   return {blended,settled,darkGain,brightGain,brightFilter,reset,p95Ms:timings[114]};
  });
  check('real canvas blends rather than jumps on a color cut',pixelResults.blended[0]>100&&pixelResults.blended[2]>20&&pixelResults.blended[2]<150,pixelResults);
  check('transition settles without lingering prior color',pixelResults.settled[0]<5&&pixelResults.settled[2]>250);
  check('black scene rapidly suppresses peripheral light',pixelResults.darkGain<.03);
  check('white scene caps glow even with 180 percent user brightness',pixelResults.brightGain<.5);
  check('brightness cap is applied before CSS clipping',/brightness\(0\.84/.test(pixelResults.brightFilter),pixelResults.brightFilter);
  check('source reset never blends the previous video',pixelResults.reset[0]===255&&pixelResults.reset[2]===0);
  await page.evaluate(()=>{
   window.sampleCosts=[];
   // The active engine already owns its processor; intercept only its output canvas.
   window.originalHaloDraw=CanvasRenderingContext2D.prototype.drawImage;
   window.pressure=false;
   CanvasRenderingContext2D.prototype.drawImage=function(...args){
    const started=performance.now();
    if(pressure&&this.canvas.closest('#halo-youtube-layer'))while(performance.now()-started<9){}
    const result=originalHaloDraw.apply(this,args);
    if(this.canvas.closest('#halo-youtube-layer'))sampleCosts.push(performance.now()-started);
    return result;
   };
   window.pressure=true;
  });
  await page.waitForFunction(()=>document.getElementById('halo-youtube-ui').shadowRoot.getElementById('runtime-status').textContent.includes('15 帧'),{},{timeout:7000});
  check('live engine automatically drops to 15 fps under sustained injected work',true);
  await page.evaluate(()=>{window.pressure=false;});
  await page.waitForFunction(()=>document.getElementById('halo-youtube-ui').shadowRoot.getElementById('runtime-status').textContent.includes('30 帧'),{},{timeout:18000});
  check('live engine recovers to 30 fps after sustained healthy sampling',true);
  await page.evaluate(()=>{const root=document.getElementById('halo-youtube-ui').shadowRoot;root.getElementById('quality').value='smooth';root.getElementById('quality').dispatchEvent(new Event('change'));window.pressure=true;});
  await page.waitForTimeout(1600);
  check('load adaptation never rewrites manual quality',await page.evaluate(()=>JSON.parse(localStorage.getItem('halo-youtube-v1')).quality==='smooth'&&!document.getElementById('halo-youtube-ui').shadowRoot.getElementById('runtime-status').textContent.includes('自动')));
  await page.evaluate(()=>{window.pressure=false;CanvasRenderingContext2D.prototype.drawImage=originalHaloDraw;const root=document.getElementById('halo-youtube-ui').shadowRoot;root.getElementById('quality').value='auto';root.getElementById('quality').dispatchEvent(new Event('change'));root.getElementById('toggle').click();root.getElementById('tab-settings').click();});
  await page.screenshot({path:path.join(output,'auto-light.png')});
  check('engine produces no uncaught browser errors',errors.length===0,errors);
  await page.close();

  const popup=await browser.newPage({viewport:{width:420,height:720}});
  const mock=fs.readFileSync(path.join(__dirname,'ui-fixture/mock.js'),'utf8');
  await popup.route('**/mock.js',route=>route.fulfill({contentType:'text/javascript',body:mock+`
window.connection={mode:'ready',permission:true,reloads:[],retries:0,requests:0,tab:{id:1,url:'https://www.youtube.com/watch?v=test'}};
chrome.tabs.query=async()=>[{...connection.tab}];
chrome.permissions={contains:async()=>{if(connection.permission==='unknown')throw Error('Unsupported');return connection.permission;},request:async()=>{connection.requests++;connection.permission=true;return true;}};
chrome.tabs.reload=async id=>{connection.reloads.push(id);connection.mode='ready';};
chrome.tabs.sendMessage=async(id,message)=>{if(connection.mode==='hang')return new Promise(()=>{});if(connection.mode==='lost')throw Error('Disconnected');if(message.type==='halo-retry'){connection.retries++;connection.mode='ready';return {ok:true};}return {status:connection.mode==='sampling'?'暂时无法读取视频画面，请重试':'环境光正在生效',retry:connection.mode==='sampling'};};
` }));
  await popup.goto(base+'preview.html');
  const waitText=text=>popup.waitForFunction(text=>document.getElementById('controls').shadowRoot.getElementById('runtime-status').title.includes(text),text,{timeout:7000});
  const retry=()=>popup.locator('#controls #retry').click();
  const button=()=>popup.evaluate(()=>{const b=document.getElementById('controls').shadowRoot.getElementById('retry');return {hidden:b.hidden,text:b.textContent};});
  await waitText('正在生效');check('connected renderer hides unnecessary recovery action',(await button()).hidden);
  await popup.evaluate(()=>{connection.permission=false;});await popup.waitForTimeout(1700);check('working renderer takes precedence over incomplete permission inventory',(await button()).hidden);await popup.evaluate(()=>{connection.permission=true;});
  await popup.evaluate(()=>{connection.mode='sampling';});await waitText('读取');await retry();await waitText('正在生效');
  check('sampling retry reaches engine without reloading page',await popup.evaluate(()=>connection.retries===1&&connection.reloads.length===0));
  await popup.evaluate(()=>{connection.mode='lost';});await waitText('连接已失效');check('lost connection offers explicit page reload',(await button()).text==='刷新视频页');await retry();await waitText('正在生效');
  check('reload reconnects only the requested tab',await popup.evaluate(()=>connection.reloads.length===1&&connection.reloads[0]===1));
  await popup.evaluate(()=>{connection.permission=false;connection.mode='lost';});await waitText('尚未获得');check('confirmed missing permission offers authorization',(await button()).text==='授权网站');await retry();await waitText('正在生效');
  check('permission click requests access then reloads',await popup.evaluate(()=>connection.requests===1&&connection.reloads.length===2));
  await popup.evaluate(()=>{connection.permission=false;connection.mode='lost';window.requestPermission=chrome.permissions.request;chrome.permissions.request=async()=>false;});await waitText('尚未获得');await retry();await waitText('未获得网站权限，可再次授权');
  check('declined permission never reloads or changes user settings',await popup.evaluate(()=>connection.reloads.length===2&&localStorage.getItem('halo-youtube-v1')===null));
  await popup.evaluate(()=>{chrome.permissions.request=window.requestPermission;connection.permission='unknown';connection.mode='ready';});await waitText('正在生效');await popup.waitForTimeout(1700);check('unsupported permission query does not block a working connection',(await button()).hidden);
  await popup.evaluate(()=>{connection.mode='hang';});await waitText('连接已失效');check('hung connection times out with a recovery action',!(await button()).hidden);
  await popup.evaluate(()=>{connection.mode='lost';connection.tab={id:9,url:'https://www.youtube.com/watch?v=other'};document.getElementById('controls').shadowRoot.getElementById('retry').click();});await popup.waitForTimeout(100);
  check('stale recovery never reloads a newly selected tab',await popup.evaluate(()=>connection.reloads.length===2));
  await waitText('连接已失效');
  const bounds=await popup.evaluate(()=>{const r=document.getElementById('controls').shadowRoot, panel=r.getElementById('panel').getBoundingClientRect();return ['retry','enabled','tab-settings'].map(id=>{const b=r.getElementById(id).getBoundingClientRect();return {id,left:b.left,right:b.right,panelRight:panel.right,visible:b.width>0&&b.left>=panel.left&&b.right<=panel.right};});});
  check('long recovery text keeps the action, switch and tabs inside the panel',bounds.every(b=>b.visible),bounds);
  await popup.screenshot({path:path.join(output,'connection-recovery.png')});
  await popup.evaluate(()=>{document.getElementById('site').value='bilibili';document.getElementById('site').dispatchEvent(new Event('change'));});await waitText('设置将用于');
  check('switching websites clears the previous recovery action',(await button()).hidden);
  await popup.close();
 } finally {
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');
  console.log(results);await browser.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
