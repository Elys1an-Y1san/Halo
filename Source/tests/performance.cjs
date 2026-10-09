/* Optional real-browser workload benchmark. Requires Playwright and Chromium.
   HALO_PERF_BASELINE=1 records the pre-optimization workload without budgets. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = path.join(root, 'src', url.pathname);
  if (url.pathname === '/panel.html') file = path.join(__dirname, 'ui-fixture/youtube-engine.html');
  if (['/mock.js', '/youtube-fixture.js'].includes(url.pathname)) file = path.join(__dirname, 'ui-fixture', url.pathname);
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  let content = fs.readFileSync(file, 'utf8');
  if (url.pathname === '/panel.html') content = content.replace('<script src="youtube-engine-test.js"></script>', '');
  if (url.pathname === '/youtube-fixture.js') content = content.replace('3500', '0');
  res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'text/javascript');
  res.end(content);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, ...(process.env.HALO_CHROME_PATH ? { executablePath: process.env.HALO_CHROME_PATH } : {}) });
  const report = { browser: browser.version(), durationMs: 1600, scenarios: {} };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await page.addInitScript(({ fallback }) => {
      if (fallback) HTMLVideoElement.prototype.requestVideoFrameCallback = undefined;
      window.metrics = { scans: 0, styles: 0, rects: 0, draws: 0, runtime: 0 };
      const query = Document.prototype.querySelectorAll;
      Document.prototype.querySelectorAll = function(selector) { if (selector === 'video') metrics.scans++; return query.call(this, selector); };
      const computed = window.getComputedStyle;
      window.getComputedStyle = (...args) => { metrics.styles++; return computed(...args); };
      const rect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function() { metrics.rects++; return rect.call(this); };
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function(...args) { if (this.canvas.closest('#halo-youtube-layer')) { metrics.draws++; window.lastSampledVideo = args[0]; } return draw.apply(this, args); };
    }, { fallback: !!process.env.HALO_NO_VIDEO_CALLBACKS });
    await page.goto(`http://127.0.0.1:${server.address().port}/panel.html`);
    await page.waitForFunction(() => document.querySelector('#halo-youtube-layer')?.hidden === false);
    await page.evaluate(() => {
      const quality=document.getElementById('halo-youtube-ui').shadowRoot.getElementById('quality');
      quality.value='balanced';quality.dispatchEvent(new Event('change'));
      const runtime = HaloUI.runtime;
      HaloUI.runtime = (...args) => { metrics.runtime++; return runtime(...args); };
      const group = document.createElement('section');
      group.id = 'recommendations';
      // A long feed: one active player and 24 offscreen candidates sharing ancestors.
      group.style.cssText = 'position:absolute;top:2000px';
      for (let i = 0; i < 24; i++) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = '<div><video style="width:320px;height:180px"></video></div>';
        group.append(wrapper);
      }
      document.body.append(group);
      const noise = document.createElement('div'); noise.id = 'noise'; document.body.append(noise);
    });
    await page.waitForTimeout(1000);
    const measure = async (name, mode) => {
      report.scenarios[name] = await page.evaluate(async ({ duration, mode }) => {
        for (const key of Object.keys(metrics)) metrics[key] = 0;
        const start = performance.now();
        let ticks = 0;
        await new Promise(resolve => {
          const step = () => {
            if (mode === 'scroll' || mode === 'hidden') window.dispatchEvent(new Event('scroll'));
            if (mode === 'noise' || mode === 'hidden') document.getElementById('noise').textContent = String(ticks++);
            if (performance.now() - start >= duration) resolve(); else setTimeout(step, 16);
          };
          step();
        });
        return { ...metrics, elapsedMs: Math.round(performance.now() - start) };
      }, { duration: report.durationMs, mode });
    };
    await measure('playing', 'idle');
    await measure('scrolling', 'scroll');
    await measure('unrelatedMutations', 'noise');
    await page.evaluate(() => document.querySelector('video').pause());
    await page.waitForTimeout(200);
    await measure('paused', 'idle');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await measure('hiddenWithEvents', 'hidden');
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); return document.querySelector('video').play(); });
    await page.waitForFunction(() => !document.getElementById('halo-youtube-layer').hidden);
    await measure('resumed', 'idle');
    if (!process.env.HALO_PERF_BASELINE) {
      assert.equal(report.scenarios.scrolling.scans, 0, 'scroll uses cached video candidates');
      assert(report.scenarios.scrolling.styles < 1800, 'scroll discovery is throttled and shares ancestor checks');
      assert.equal(report.scenarios.unrelatedMutations.scans, 0, 'text changes do not invalidate video candidates');
      assert.equal(report.scenarios.paused.draws, 0, 'paused media is not resampled');
      for (const key of ['scans', 'styles', 'rects', 'draws', 'runtime']) assert.equal(report.scenarios.hiddenWithEvents[key], 0, `hidden pages do no ${key} work`);
      assert(report.scenarios.resumed.draws > 0, 'visible pages resume rendering');
      assert(report.scenarios.playing.draws > 0, 'benchmark exercises live video');
      assert(report.scenarios.playing.draws <= 55, 'balanced quality retains its 30-fps cap');
      await page.evaluate(() => { document.querySelector('#movie_player').style.display = 'none'; });
      await page.waitForFunction(() => document.querySelector('#halo-youtube-layer').hidden);
      await page.evaluate(() => { document.querySelector('#movie_player').style.display = ''; });
      await page.waitForFunction(() => !document.querySelector('#halo-youtube-layer').hidden);
      await page.evaluate(() => {
        const old = document.querySelector('video'), next = old.cloneNode();
        next.srcObject = old.srcObject; old.replaceWith(next); return next.play();
      });
      await page.waitForFunction(() => window.lastSampledVideo === document.querySelector('video'));
      await page.evaluate(() => { window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); });
      await measure('pageHiddenWithEvents', 'hidden');
      for (const key of ['scans', 'styles', 'rects', 'draws', 'runtime']) assert.equal(report.scenarios.pageHiddenWithEvents[key], 0, `suspended pages do no ${key} work`);
      await page.evaluate(() => {
        const old = document.querySelector('video'), next = old.cloneNode();
        next.srcObject = old.srcObject; old.replaceWith(next); return next.play();
      });
      await page.evaluate(() => { window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
      await page.waitForFunction(() => !document.querySelector('#halo-youtube-layer').hidden && window.lastSampledVideo === document.querySelector('video'));
      report.lifecycle = 'CSS visibility, replacement video and page cache restoration passed';
    }
  } finally {
    const output = path.resolve(process.argv[2] || path.join(root, '.build/performance/current.json'));
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    await browser.close(); server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
