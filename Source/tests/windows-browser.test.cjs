/* Runs only on an isolated Windows CI runner, after the actual installer. */
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  assert.equal(process.platform, 'win32', 'this verification requires Windows');
  const install = path.join(process.env.LOCALAPPDATA, 'Halo');
  const manifest = JSON.parse(await fs.readFile(path.join(install, 'Extension', 'manifest.json'), 'utf8'));
  const portFile = path.join(install, 'BrowserProfile', 'DevToolsActivePort');
  let portData;
  for (let attempt = 0; attempt < 120; attempt++) {
    try { portData = await fs.readFile(portFile, 'utf8'); break; } catch { await pause(500); }
  }
  assert.ok(portData, 'the installed browser must start');
  const [port, endpoint] = portData.trim().split(/\r?\n/);
  const socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, {once: true}); socket.addEventListener('error', reject, {once: true}); });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const response = JSON.parse(event.data), entry = pending.get(response.id);
    if (!entry) return;
    clearTimeout(entry.timer);pending.delete(response.id);
    response.error ? entry.reject(Error(JSON.stringify(response.error))) : entry.resolve(response.result);
  });
  function command(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id);reject(Error(`Timed out: ${method}`)); }, 15000);
      pending.set(id, {resolve, reject, timer});
      socket.send(JSON.stringify({id, method, params, ...(sessionId ? {sessionId} : {})}));
    });
  }
  try {
    let worker;
    for (let attempt = 0; attempt < 30; attempt++) {
      const {targetInfos} = await command('Target.getTargets');
      worker = targetInfos.find(target => target.type === 'service_worker' && target.url.startsWith('chrome-extension://') && target.url.endsWith('/scripts/background.js'));
      if (worker) break;
      await pause(500);
    }
    assert.ok(worker, 'the extension service worker must load automatically');
    const {sessionId} = await command('Target.attachToTarget', {targetId: worker.targetId, flatten: true});
    const {result, exceptionDetails} = await command('Runtime.evaluate', {expression: 'chrome.runtime.getManifest()', returnByValue: true}, sessionId);
    assert.equal(exceptionDetails, undefined);
    assert.equal(result.value.version, manifest.version);
    assert.equal(result.value.name, '映光 Halo');
    assert.deepEqual(result.value.permissions, ['storage', 'activeTab']);
    const desktop = path.join(process.env.USERPROFILE, 'Desktop', '映光 Halo.lnk');
    assert.ok((await fs.stat(desktop)).size > 0, 'the Windows desktop shortcut must be created');
    console.log(`PASS: Windows installer, official browser download, desktop shortcut, auto-loaded Halo ${manifest.version}`);
    await command('Browser.close');
  } finally { socket.close(); }
})().catch(error => { console.error(error);process.exitCode = 1; });
