const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(new URL('../src/scripts/halo-background.js', `file://${__filename}`), 'utf8');

function setup({native = true, release = {ok: true, available: true}, fail = false} = {}) {
  const calls = [];
  let listener;
  const runtime = {
    id: 'halo-test',
    getManifest: () => ({version: '1.0.3', permissions: native ? ['nativeMessaging'] : ['storage']}),
    onInstalled: {addListener() {}},
    onMessage: {addListener(fn) {listener = fn;}},
    async sendNativeMessage(app, message) {
      calls.push({app, message});
      if (fail) throw Error('native unavailable');
      return {ok: true, supported: true};
    }
  };
  const context = {browser: {runtime, storage: {local: {set() {}}}}, HaloUpdates: {create: () => ({check: async (version, force) => {
    calls.push({version, force});
    return release;
  }})}};
  vm.createContext(context);
  vm.runInContext(source, context);
  return {calls, listener, send: message => new Promise(resolve => listener(message, {id: 'halo-test'}, resolve))};
}

test('Chrome cannot invoke the native updater', async () => {
  const {send, calls} = setup({native: false});
  assert.equal((await send({type: 'halo-install-update'})).supported, false);
  assert.equal(calls.length, 0);
});
test('Safari probes capability without a release request', async () => {
  const {send, calls} = setup();
  assert.equal((await send({type: 'halo-native-update-info'})).supported, true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{app: 'local.ambientlight.safari', message: {type: 'halo-update-info'}}]);
});
test('installation rechecks latest version and forwards no page-supplied URL', async () => {
  const {send, calls} = setup();
  assert.equal((await send({type: 'halo-install-update', url: 'https://evil.example/'})).ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    {version: '1.0.3', force: true},
    {app: 'local.ambientlight.safari', message: {type: 'halo-install-update'}}
  ]);
});
for (const release of [{ok: true, available: false}, {ok: false, code: 'network'}]) {
  test(`no native launch for ${release.ok ? 'current version' : 'failed lookup'}`, async () => {
    const {send, calls} = setup({release});
    const result = await send({type: 'halo-install-update'});
    assert.equal(result.ok, false);
    assert.equal(result.code, release.ok ? 'current' : 'network');
    assert.equal(calls.length, 1);
  });
}
test('native launch failure is recoverable', async () => {
  const {send} = setup({fail: true});
  assert.equal((await send({type: 'halo-install-update'})).code, 'native_failed');
});
test('other extensions cannot request an update', () => {
  const {listener, calls} = setup();
  assert.equal(listener({type: 'halo-install-update'}, {id: 'other-extension'}, () => assert.fail()), false);
  assert.equal(calls.length, 0);
});
