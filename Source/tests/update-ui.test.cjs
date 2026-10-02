const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(new URL('../src/scripts/halo-ui.js', `file://${__filename}`), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup(sendMessage) {
  const ids = new Map(), timers = new Map(); let timerID = 0;
  const root = {getElementById(id) {
    if (!ids.has(id)) ids.set(id, {hidden:true, disabled:false, textContent:'', handlers:{}, addEventListener(type, fn) {this.handlers[type]=fn;}});
    return ids.get(id);
  }};
  const context = {URL, setTimeout(fn) {timers.set(++timerID,fn);return timerID;}, clearTimeout(id) {timers.delete(id);}};
  vm.runInNewContext(source,context);
  context.HaloUI.bindUpdates(root,{runtime:{getManifest:()=>({version:'1.0.6'}),sendMessage}});
  return {get:root.getElementById, timers};
}
test('synchronous invalidated-context exception cannot break control setup',async()=>{
 const h=setup(()=>{throw Error('Extension context invalidated');});await tick();
 await h.get('check-update').handlers.click();
 assert.match(h.get('update-status').textContent,/查询失败/);assert.equal(h.get('check-update').disabled,false);
 assert.equal(h.timers.size,0);
});
test('unresponsive background times out and restores the check button',async()=>{
 const h=setup(()=>new Promise(()=>{}));const checking=h.get('check-update').handlers.click();await tick();
 assert.equal(h.get('check-update').disabled,true);for(const expire of [...h.timers.values()])expire();await checking;
 assert.equal(h.get('check-update').disabled,false);assert.match(h.get('update-status').textContent,/重试/);
});
test('release link remains available with native updater support',async()=>{
 const h=setup(async message=>message.type==='halo-native-update-info'?{supported:true}:{ok:true,available:true,latest:'1.0.10',current:'1.0.6',url:'https://github.com/Elys1an-Y1san/Halo/releases/tag/v1.0.10'});
 await tick();await h.get('check-update').handlers.click();
 assert.equal(h.get('release-link').hidden,false);assert.equal(h.get('install-update').hidden,false);
 assert.equal(h.timers.size,0);
});
