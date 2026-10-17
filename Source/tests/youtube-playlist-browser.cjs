/* Optional Playwright regression for the playlist surfaces seen on live YouTube.
 * NODE_PATH=/path/to/playwright/node_modules node tests/youtube-playlist-browser.cjs
 * HALO_YOUTUBE_CSS can point at an older stylesheet to reproduce issue #1.
 */
const {chromium}=require('playwright');
const {readFileSync,mkdirSync}=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const css=readFileSync(process.env.HALO_YOUTUBE_CSS||path.join(__dirname,'../src/styles/halo-youtube.css'),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.HALO_CHROME_PATH?{executablePath:process.env.HALO_CHROME_PATH}:{})});
 let checks=0;
 try{
  for(const dark of [false,true]){
   const page=await browser.newPage({viewport:{width:1280,height:900}});
   await page.setContent(`<html ${dark?'dark':''}><head><style>
    html{--site-background:#fff;color:#0f0f0f}html[dark]{--site-background:#0f0f0f;color:#f1f1f1}
    ytd-playlist-panel-renderer{display:block;width:400px;background:var(--site-background)}
    #container.ytd-playlist-panel-renderer{border:1px solid #888;border-radius:12px;overflow:hidden}
    .header.ytd-playlist-panel-renderer,#items.ytd-playlist-panel-renderer{background:var(--site-background)}
    .header{padding:20px}#items.ytd-playlist-panel-renderer{height:120px;overflow:auto}
    ytd-playlist-panel-video-renderer{display:block;height:80px}ytd-playlist-panel-video-renderer[selected]{background:#ffffff24}
    ytd-playlist-panel-video-renderer:hover{background:#ffffff38}
    .thumbnail-overlay{background:#000c}#unrelated #items,#unrelated .header{background:#ff0000}
   </style></head><body><ytd-playlist-panel-renderer><div id="container" class="ytd-playlist-panel-renderer"><div class="header ytd-playlist-panel-renderer"><button aria-label="Collapse playlist">Playlist</button></div><div id="items" class="ytd-playlist-panel-renderer"><ytd-playlist-panel-video-renderer selected><a href="#video"><span class="thumbnail-overlay">4:13</span>Current video</a></ytd-playlist-panel-video-renderer><ytd-playlist-panel-video-renderer>Next video</ytd-playlist-panel-video-renderer><ytd-playlist-panel-video-renderer>Last video</ytd-playlist-panel-video-renderer></div></div></ytd-playlist-panel-renderer><div id="unrelated"><div id="items">Other items</div><div class="header">Other header</div></div></body></html>`);
   await page.addStyleTag({content:css});
   const surfaces=()=>page.locator('ytd-playlist-panel-renderer .header,ytd-playlist-panel-renderer #items').evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor));
   const native=dark?'rgb(15, 15, 15)':'rgb(255, 255, 255)';
   assert.deepEqual(await surfaces(),[native,native]);checks++;
   const before=await page.locator('ytd-playlist-panel-renderer').boundingBox();
   await page.evaluate(()=>document.documentElement.setAttribute('data-halo-youtube',''));
   assert.deepEqual(await surfaces(),['rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)']);checks++;
   assert.equal(await page.locator('ytd-playlist-panel-renderer').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(24, 29, 39, 0.6)');checks++;
   assert.deepEqual(await page.locator('ytd-playlist-panel-renderer').boundingBox(),before);checks++;
   assert.equal(await page.locator('[selected]').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(255, 255, 255, 0.14)');checks++;
   await page.locator('ytd-playlist-panel-video-renderer').nth(1).hover();
   assert.equal(await page.locator('ytd-playlist-panel-video-renderer').nth(1).evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(255, 255, 255, 0.22)');checks++;
   assert.equal(await page.locator('.thumbnail-overlay').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0.8)');checks++;
   assert.deepEqual(await page.locator('#unrelated > *').evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor)),['rgb(255, 0, 0)','rgb(255, 0, 0)']);checks++;
   await page.locator('ytd-playlist-panel-renderer #items').evaluate(e=>e.scrollTop=60);
   assert.equal(await page.locator('ytd-playlist-panel-renderer #items').evaluate(e=>e.scrollTop),60);checks++;
   await page.getByRole('button',{name:'Collapse playlist'}).click();checks++;
   await page.evaluate(()=>{const p=document.querySelector('ytd-playlist-panel-renderer');p.replaceWith(p.cloneNode(true));});
   assert.deepEqual(await surfaces(),['rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)']);checks++;
   if(process.env.HALO_SCREENSHOT_DIR){mkdirSync(process.env.HALO_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.HALO_SCREENSHOT_DIR,`playlist-${dark?'dark':'light'}.png`)});}
   await page.evaluate(()=>document.documentElement.removeAttribute('data-halo-youtube'));
   assert.deepEqual(await surfaces(),[native,native]);checks++;
   assert.equal(await page.locator('html').evaluate(e=>e.hasAttribute('dark')),dark);checks++;
   await page.close();
  }
  console.log(`PASS YouTube playlist: ${checks} checks (light/dark, enabled/disabled, dynamic replacement, selection/hover, controls, scroll, layout and scoped backgrounds)`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
