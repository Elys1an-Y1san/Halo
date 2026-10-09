/* Run with selenium-webdriver/geckodriver available and HALO_FIREFOX_BINARY set.
   Uses a disposable profile, the actual unsigned ZIP, and real extension APIs. */
const {Builder} = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const base = path.resolve(__dirname, '..');
  const version = require('../package.json').version;
  const uuid = '0ef36dd6-35b5-4c4d-8e7f-07c56a4a8732';
  const options = new firefox.Options().setBinary(process.env.HALO_FIREFOX_BINARY).addArguments('-headless')
    .setPreference('extensions.webextensions.uuids', JSON.stringify({'halo@elys1an-y1san.github.io': uuid}));
  const executable = await require('geckodriver').download();
  const driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options)
    .setFirefoxService(new firefox.ServiceBuilder(executable)).build();
  const checks = [];
  async function check(name, fn) { await fn(); checks.push({name, pass:true}); console.log('PASS', name); }
  try {
    await driver.manage().setTimeouts({script:20000, pageLoad:40000});
    const addon = await driver.installAddon(path.join(base, `../Builds/firefox/${version}/Halo-Firefox-${version}-unsigned.zip`), true);
    assert.equal(addon, 'halo@elys1an-y1san.github.io');
    checks.push({name:'unsigned ZIP installs temporarily', pass:true});
    await driver.get(`moz-extension://${uuid}/options.html`);
    await driver.wait(() => driver.executeScript('return !!document.querySelector("#controls")?.shadowRoot?.querySelector("#blur")'), 10000);
    await check('real storage persists popup preset across reload', async () => {
      await driver.executeScript('document.querySelector("#controls").shadowRoot.querySelector("[data-preset=soft]").click()');
      await driver.wait(async () => (await driver.executeAsyncScript('const done=arguments[arguments.length-1];browser.storage.local.get("halo-youtube-v1").then(done)'))['halo-youtube-v1']?.blur === 40, 5000);
      await driver.navigate().refresh();
      await driver.wait(() => driver.executeScript('return document.querySelector("#controls")?.shadowRoot?.querySelector("#blur")?.value === "40"'), 5000);
    });
    await check('background loads and rejects native update capability', async () => {
      const response = await driver.executeAsyncScript('const done=arguments[arguments.length-1];browser.runtime.sendMessage({type:"halo-native-update-info"}).then(done)');
      assert.equal(response.supported, false);
    });
    await check('background update message returns a structured response', async () => {
      const response = await driver.executeAsyncScript('const done=arguments[arguments.length-1];browser.runtime.sendMessage({type:"halo-check-update",force:true}).then(done)');
      assert.equal(typeof response.ok, 'boolean');
      assert.ok(response.ok ? response.latest : response.code);
      checks.push({name:'update response', response});
    });
    for (const [name,url,selector] of [['youtube','https://www.youtube.com/watch?v=jfKfPfyJRdk','#halo-youtube-ui'],['bilibili','https://www.bilibili.com/video/BV1xx411c7mD/','#bili-ambient-ui']]) {
      await driver.get(url);
      try {
        await driver.wait(() => driver.executeScript('return !!document.querySelector(arguments[0])?.shadowRoot', selector), 20000);
        const state = await driver.executeScript('return {title:document.title, video:!!document.querySelector("video"), renderer:!!document.querySelector(".ambientlight__container,#bili-ambient-layer"), enabled:document.documentElement.hasAttribute("data-ambientlight-enabled"), ready:document.querySelector("video")?.readyState, paused:document.querySelector("video")?.paused}');
        checks.push({name:`${name} real site content injection`,pass:true,state});
      } catch (error) { checks.push({name:`${name} real site content injection`,pass:false,error:error.message,title:await driver.getTitle()}); }
      fs.writeFileSync(path.join(base,`.build/firefox-${name}.png`), await driver.takeScreenshot(), 'base64');
    }
  } finally {
    const caps = await driver.getCapabilities();
    fs.mkdirSync(path.join(base,'.build'),{recursive:true});
    fs.writeFileSync(path.join(base,'.build/firefox-runtime.json'),JSON.stringify({browser:caps.get('browserVersion'),checks},null,2));
    await driver.quit();
    if (checks.some(check => check.pass === false)) process.exitCode = 1;
  }
})().catch(error => {console.error(error);process.exitCode=1;});
