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
    ytd-app{--yt-spec-text-primary:#0f0f0f;--yt-spec-text-secondary:#606060;--yt-spec-icon-active-other:#0f0f0f;--yt-spec-badge-chip-background:#f2f2f2}
    html[dark] ytd-app{--yt-spec-text-primary:#f1f1f1;--yt-spec-text-secondary:#aaa;--yt-spec-icon-active-other:#fff;--yt-spec-badge-chip-background:#ffffff24}
    ytd-playlist-panel-renderer{display:block;width:400px;background:var(--site-background)}
    .title,#video-title{color:light-dark(#0f0f0f,#f1f1f1)}.byline{color:light-dark(#606060,#aaa)}.icon{color:light-dark(#0f0f0f,#fff)}
    ytd-app{color-scheme:light}html[dark] ytd-app{color-scheme:dark}
    #container.ytd-playlist-panel-renderer{border:1px solid #888;border-radius:12px;overflow:hidden}
    .header.ytd-playlist-panel-renderer,#items.ytd-playlist-panel-renderer{background:var(--site-background)}
    .header{padding:20px}#items.ytd-playlist-panel-renderer{height:120px;overflow:auto}
    ytd-playlist-panel-video-renderer{display:block;height:80px}ytd-playlist-panel-video-renderer[selected]{background:light-dark(#f2f2f2,#ffffff24)}
    ytd-playlist-panel-video-renderer:hover{background:#ffffff38}
    .thumbnail-overlay{background:#000c}#unrelated #items,#unrelated .header{background:#ff0000}
   </style></head><body><ytd-app><ytd-playlist-panel-renderer><div id="container" class="ytd-playlist-panel-renderer"><div class="header ytd-playlist-panel-renderer"><button aria-label="Collapse playlist">Playlist</button><span class="title">Playlist title</span><span class="byline">Publisher</span><yt-icon class="icon">☰</yt-icon></div><div id="items" class="ytd-playlist-panel-renderer"><ytd-playlist-panel-video-renderer selected><a id="video-title" href="#video"><span class="thumbnail-overlay">4:13</span>Current video</a></ytd-playlist-panel-video-renderer><ytd-playlist-panel-video-renderer><span id="video-title">Next video</span></ytd-playlist-panel-video-renderer><ytd-playlist-panel-video-renderer><span id="video-title">Last video</span></ytd-playlist-panel-video-renderer></div></div></ytd-playlist-panel-renderer></ytd-app><div id="unrelated"><div id="items">Other items</div><div class="header">Other header</div></div></body></html>`);
   await page.addStyleTag({content:css});
   const surfaces=()=>page.locator('ytd-playlist-panel-renderer .header,ytd-playlist-panel-renderer #items').evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor));
   const native=dark?'rgb(15, 15, 15)':'rgb(255, 255, 255)';
   assert.deepEqual(await surfaces(),[native,native]);checks++;
   const before=await page.locator('ytd-playlist-panel-renderer').boundingBox();
   await page.evaluate(()=>document.documentElement.setAttribute('data-halo-youtube',''));
   assert.deepEqual(await surfaces(),['rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)']);checks++;
   assert.equal(await page.locator('ytd-playlist-panel-renderer').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(24, 29, 39, 0.8)');checks++;
   assert.deepEqual(await page.locator('ytd-playlist-panel-renderer').boundingBox(),before);checks++;
   assert.deepEqual(await page.locator('.title,.byline,.icon').evaluateAll(es=>es.map(e=>getComputedStyle(e).color)),['rgb(241, 243, 247)','rgb(189, 197, 208)','rgb(241, 243, 247)']);checks++;
   assert.ok((await page.locator('#video-title').evaluateAll(es=>es.map(e=>getComputedStyle(e).color))).every(c=>c==='rgb(241, 243, 247)'));checks++;
   assert.equal(await page.locator('[selected]').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0.16)');checks++;
   await page.locator('ytd-playlist-panel-video-renderer').nth(1).hover();
   assert.equal(await page.locator('ytd-playlist-panel-video-renderer').nth(1).evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0.25)');checks++;
   const paint=await page.evaluate(()=>{const c=e=>getComputedStyle(e);return {shell:c(document.querySelector('ytd-playlist-panel-renderer')).backgroundColor,selected:c(document.querySelector('[selected]')).backgroundColor,hover:c(document.querySelectorAll('ytd-playlist-panel-video-renderer')[1]).backgroundColor,text:[...document.querySelectorAll('.title,.byline,#video-title')].map(e=>c(e).color)};});
   const rgba=s=>{const n=s.match(/[\d.]+/g).map(Number);return [...n.slice(0,3),n[3]??1];};
   const over=(front,back)=>front.slice(0,3).map((v,i)=>v*front[3]+back[i]*(1-front[3]));
   const luminance=rgb=>rgb.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
   for(const frame of [[0,0,0],[255,255,255]])for(const row of [[0,0,0,0],rgba(paint.selected),rgba(paint.hover)])for(const ink of paint.text){const bg=over(row,over(rgba(paint.shell),frame)),a=luminance(rgba(ink)),b=luminance(bg);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,'playlist text contrast over extreme video frames');}checks++;
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
   assert.deepEqual(await page.locator('.title,.byline,.icon').evaluateAll(es=>es.map(e=>getComputedStyle(e).color)),dark?['rgb(241, 241, 241)','rgb(170, 170, 170)','rgb(255, 255, 255)']:['rgb(15, 15, 15)','rgb(96, 96, 96)','rgb(15, 15, 15)']);checks++;
   assert.ok((await page.locator('#video-title').evaluateAll(es=>es.map(e=>getComputedStyle(e).color))).every(c=>c===(dark?'rgb(241, 241, 241)':'rgb(15, 15, 15)')));checks++;
   assert.equal(await page.locator('html').evaluate(e=>e.hasAttribute('dark')),dark);checks++;
   await page.close();
  }
  console.log(`PASS YouTube playlist: ${checks} checks (light/dark, enabled/disabled, dynamic replacement, selection/hover, controls, scroll, layout and scoped backgrounds)`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
