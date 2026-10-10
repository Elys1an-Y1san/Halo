/* Real browser regression with isolated extension APIs, never user-profile state. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.HALO_TEST_URL||'http://127.0.0.1:8766/';
const output=path.resolve(process.argv[2]||'.local/tests/1.3.0');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.HALO_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=no-user-gesture-required']});
 const results=[];const check=(name,ok)=>{results.push({name,pass:!!ok});assert(ok,name);};
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:568}]){
   const page=await browser.newPage({viewport,reducedMotion:viewport.width===320?'reduce':'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'onboarding.html');await page.locator('#guide').waitFor({state:'visible'});await page.waitForTimeout(1200);
   check('logo loads at '+viewport.width,await page.locator('#guide-logo').evaluate(e=>e.complete&&e.naturalWidth===128));
   check('complete layout and all text lines share viewport center at '+viewport.width,await page.locator('.guide-stage').evaluate(e=>{const b=e.getBoundingClientRect();return Math.abs(b.x+b.width/2-innerWidth/2)<1&&Math.abs(b.y+b.height/2-innerHeight/2)<1&&[...e.querySelectorAll('.guide-line')].every(n=>{const r=n.getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)<1;})&&b.top>=0&&b.bottom<=innerHeight;}));
   check('first step does not steal focus',await page.evaluate(()=>document.activeElement===document.body));
   await page.screenshot({path:path.join(output,'guide-welcome-'+viewport.width+'.png')});
   await page.locator('#guide-next').click();
   check('comparison tutorial changes real light without saving preferences',await page.evaluate(()=>document.querySelector('#halo-youtube-layer canvas').style.opacity==='0'&&!localStorage.getItem('halo-youtube-v1')));
   await page.locator('#guide-compare').click();
   check('show light button restores the real effect',await page.evaluate(()=>document.querySelector('#halo-youtube-layer canvas').style.opacity===''));
   await page.locator('#guide-compare').click();
   await page.evaluate(()=>document.body.classList.add('webscreen-fix'));await page.locator('#guide').waitFor({state:'hidden'});
   check('suspending comparison restores light',await page.evaluate(()=>document.querySelector('#halo-youtube-layer canvas').style.opacity===''));
   await page.evaluate(()=>document.body.classList.remove('webscreen-fix'));await page.locator('#guide').waitFor({state:'visible'});
   await page.locator('#guide-next').click();await page.waitForTimeout(1100);
   check('third step opens real controls and points at brightness',await page.locator('#panel').isVisible()&&await page.locator('#brightness').getAttribute('data-guided')!==null);
   await page.locator('#brightness').press('ArrowRight');await page.waitForTimeout(250);
   check('tutorial adjustment is real and automatically saved',await page.evaluate(()=>JSON.parse(localStorage.getItem('halo-youtube-v1')).brightness===101));
   check('profile feature is removed from the live panel',await page.evaluate(()=>{const r=document.querySelector('#halo-youtube-ui').shadowRoot;return r.querySelectorAll('[role=tab]').length===2&&!r.querySelector('#profiles,#tab-profiles');}));
   await page.screenshot({path:path.join(output,'guide-controls-'+viewport.width+'.png')});
   await page.locator('#guide-skip').click();await page.locator('#guide').waitFor({state:'hidden'});
   check('completion saves progress and leaves adjusted controls usable',await page.evaluate(()=>JSON.parse(localStorage.getItem('halo-onboarding-v1')).completedAt>0&&document.querySelector('#halo-youtube-ui').shadowRoot.querySelector('#panel').dataset.state==='open'));
   await page.evaluate(()=>runtimeListeners.forEach(fn=>fn({type:'halo-start-guide'},{id:'halo-local-fixture'},()=>{})));await page.locator('#guide').waitFor({state:'visible'});
   await page.locator('#guide-next').press('Escape');await page.locator('#guide').waitFor({state:'hidden'});
   check('Escape cleans up the replay and focuses the control',await page.evaluate(()=>{const r=document.querySelector('#halo-youtube-ui').shadowRoot;return r.activeElement.id==='toggle'&&r.querySelector('#guide').getAnimations({subtree:true}).length===0;}));
   check('no browser errors at '+viewport.width,errors.length===0);
   await page.close();
  }
  const html=fs.readFileSync(path.join(__dirname,'../src/update.html'),'utf8');
  const assetBase='https://github.com/Elys1an-Y1san/Halo/releases/download/v1.4.0/';
  for(const platform of ['chromium','firefox','safari']){
   const p=await browser.newPage({viewport:{width:1000,height:800},colorScheme:platform==='firefox'?'light':'dark'});
   await p.route('**/update.html',route=>route.fulfill({contentType:'text/html',body:html}));
   await p.addInitScript(({platform,assetBase})=>{
    window.updateCalls=[];window.updateFailure=false;
    window.chrome={storage:{local:{get:async()=>({})}},runtime:{getManifest:()=>({version:'1.3.0'}),sendMessage:async m=>{
     updateCalls.push(m.type);
     if(m.type==='halo-update-context')return {platform,mode:platform==='safari'?'native':platform==='chromium'?'directory':'manual'};
     if(m.type==='halo-install-update')return {ok:true};
     if(updateFailure)return {ok:false,code:'rate_limit'};
     return {ok:true,available:true,current:'1.3.0',latest:'1.4.0',url:'https://github.com/Elys1an-Y1san/Halo/releases/tag/v1.4.0',assets:{chromium:assetBase+'Halo-Chrome-1.4.0.zip',firefox:assetBase+'Halo-Firefox-1.4.0-unsigned.zip',safari:assetBase+'Halo-Safari-1.4.0.zip'}};
    }}};
   },{platform,assetBase});
   await p.goto(base+'update.html');await p.waitForFunction(()=>document.querySelector('#version').textContent.includes('1.3.0'));await p.locator('#check').click();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('1.4.0'));
   check(platform+' receives its own verified asset',(await p.locator('#download').getAttribute('href')).includes(platform==='chromium'?'Chrome':platform==='firefox'?'Firefox':'Safari'));
   check(platform+' only offers supported install action',await p.locator('#install').isVisible()===(platform!=='firefox'));
   if(platform==='safari'){await p.locator('#install').click();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('原生更新器已启动'));}
   await p.screenshot({path:path.join(output,'update-'+platform+'.png')});
   await p.evaluate(()=>{updateFailure=true;});await p.locator('#check').click();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('受限'));
   check(platform+' failed lookup clears stale installation and download',!(await p.locator('#download').isVisible())&&!(await p.locator('#install').isVisible()));
   check(platform+' release link visibility matches delivery path',(await p.locator('#release').isVisible())===(platform!=='chromium'));if(platform==='chromium')check('Chromium never sends user to an external download',!(await p.locator('#download').isVisible()));await p.close();
  }
 }finally{fs.writeFileSync(path.join(output,'onboarding-browser.json'),JSON.stringify(results,null,2));await browser.close();}
 console.log('PASS',results.length,'onboarding and update browser checks');
})().catch(e=>{console.error(e);process.exitCode=1;});
