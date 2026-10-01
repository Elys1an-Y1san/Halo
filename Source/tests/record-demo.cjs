/* Local fixture recording. Optional dev dependency: playwright + Chromium. */
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
(async()=>{
 const output=path.resolve(process.argv[2]||'../docs/media');await fs.mkdir(output,{recursive:true});
 const browser=await chromium.launch({headless:true,...(process.env.HALO_CHROME_PATH?{executablePath:process.env.HALO_CHROME_PATH}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,recordVideo:{dir:output,size:{width:1440,height:900}}});
 const page=await context.newPage();await page.goto('http://127.0.0.1:8765/wave.html?showcase&record=1');await page.waitForSelector('#demo-start');
 await page.getByRole('button',{name:'播放演示',exact:true}).click();
 await page.waitForTimeout(2400);await page.screenshot({path:path.join(output,'panel.jpg'),type:'jpeg',quality:92});
 await page.waitForFunction(()=>document.body.dataset.demoComplete==='true');
 const video=page.video();await context.close();await video.saveAs(path.join(output,'capture.webm'));await video.delete();
 const still=await browser.newContext({viewport:{width:1440,height:900}});const p=await still.newPage();await p.goto('http://127.0.0.1:8765/wave.html?auto&freeze=.55');await p.waitForFunction(()=>document.body.dataset.waveHeld==='true');await p.screenshot({path:path.join(output,'wave.jpg'),type:'jpeg',quality:92});await still.close();await browser.close();
})();
