const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const version = JSON.parse(fs.readFileSync(path.join(root,'Source/package.json'))).version;
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'Builds/firefox', version, 'Firefox/manifest.json')));
test('Firefox uses ordered background scripts without a service worker or native host', () => {
  assert.deepEqual(manifest.background, {scripts: ['scripts/halo-update.js', 'scripts/background.js']});
  assert.deepEqual(manifest.permissions, ['storage', 'activeTab']);
  assert.equal(manifest.minimum_chrome_version, undefined);
});
test('Firefox has its own stable identity and no MAIN-world injection', () => {
  assert.equal(manifest.browser_specific_settings.gecko.id, 'halo@elys1an-y1san.github.io');
  assert.equal(manifest.browser_specific_settings.gecko.strict_min_version, '128.0');
  assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions, {required: ['none']});
  const main = manifest.content_scripts.filter(entry => entry.world === 'MAIN');
  assert.equal(main.length, 0);
  assert.equal(manifest.web_accessible_resources, undefined);
});
test('Firefox uses the identical prepared scripts as the other browser packages', () => {
  for (const name of fs.readdirSync(path.join(root, 'Builds/chromium', version, 'Chrome/scripts'))) {
    assert.deepEqual(fs.readFileSync(path.join(root, 'Builds/firefox', version, 'Firefox/scripts', name)), fs.readFileSync(path.join(root, 'Builds/chromium', version, 'Chrome/scripts', name)), name);
  }
});
