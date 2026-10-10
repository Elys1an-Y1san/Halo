const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(__dirname+'/../src/scripts/halo-background.js','utf8');
function setup({manifest={version:'1.3.0',permissions:['storage']},installType='development',update='no_update',state={}}={}){
 let installed,listener,available;const calls=[];
 const runtime={id:'test',getManifest:()=>manifest,getURL:p=>'chrome-extension://test/'+p,onInstalled:{addListener:f=>installed=f},onMessage:{addListener:f=>listener=f},onUpdateAvailable:{addListener:f=>available=f},requestUpdateCheck:async()=>{calls.push('check');return {status:update};},reload:()=>calls.push('reload')};
 const api={runtime,management:{getSelf:async()=>({installType})},storage:{local:{get:async k=>({[k]:state[k]}),set:async o=>Object.assign(state,o)}},tabs:{query:async()=>[{id:7}],sendMessage:async(id,m)=>{calls.push({id,m});return {ok:true};},create:async o=>calls.push(o)}};
 vm.runInNewContext(source,{setTimeout,chrome:api,HaloUpdates:{create:()=>({check:async()=>({ok:true})})}});
 return{state,calls,installed,available,send:(m,sender={id:'test'})=>new Promise(r=>{if(listener(m,sender,r)===false)r({ok:false});}),tick:()=>new Promise(r=>setImmediate(r))};
}
test('install queues in-page onboarding without opening a tab; updates never queue it',async()=>{
 const h=setup();h.installed({reason:'update'});await h.tick();assert.deepEqual(h.state,{});
 h.installed({reason:'install'});await h.tick();assert.equal(h.state['halo-onboarding-v1'].pending,true);assert.equal(h.calls.length,0);
});
test('only one tab can claim onboarding, and reinstall preserves completion',async()=>{
 const h=setup({state:{'halo-onboarding-v1':{pending:true}}});
 const results=await Promise.all([h.send({type:'halo-guide-claim'}),h.send({type:'halo-guide-claim'})]);assert.equal(results.filter(r=>r.ok).length,1);
 h.installed({reason:'install'});await h.tick();assert.equal(h.state['halo-onboarding-v1'].pending,undefined);
});
test('replay targets active page; update help is an internal extension tab',async()=>{
 const h=setup();assert.equal((await h.send({type:'halo-open-onboarding'})).ok,true);assert.equal(h.calls[0].id,7);assert.equal(h.calls[0].m.type,'halo-start-guide');
 await h.send({type:'halo-open-updates'});assert.equal(h.calls[1].url,'chrome-extension://test/update.html');
});
test('unpacked Chromium uses its directory installer, not browser update check',async()=>{
 const h=setup();assert.equal((await h.send({type:'halo-update-context'})).mode,'directory');assert.equal((await h.send({type:'halo-browser-update'})).code,'manual');assert.equal(h.calls.length,0);
});
test('managed Chromium asks browser, then requires user action before reload',async()=>{
 const h=setup({installType:'normal',update:'update_available'});assert.equal((await h.send({type:'halo-update-context'})).mode,'browser');assert.equal((await h.send({type:'halo-browser-update'})).code,'ready');assert.deepEqual(h.calls,['check']);
 assert.equal((await h.send({type:'halo-browser-update'})).code,'reloading');assert.deepEqual(h.calls,['check','reload']);
});
for(const status of ['no_update','throttled'])test('browser '+status+' remains pending, not a completed update',async()=>{const h=setup({installType:'normal',update:status});const r=await h.send({type:'halo-browser-update'});assert.equal(r.ok,false);assert.equal(r.code,status);assert(!h.calls.includes('reload'));});
test('unsigned Firefox and Safari keep separate delivery paths',async()=>{
 const ff=setup({manifest:{browser_specific_settings:{gecko:{id:'halo'}},version:'1.3.0'}});assert.equal((await ff.send({type:'halo-update-context'})).platform,'firefox');assert.equal((await ff.send({type:'halo-browser-update'})).code,'manual');
 const safari=setup({manifest:{permissions:['nativeMessaging'],version:'1.3.0'}});assert.equal((await safari.send({type:'halo-update-context'})).mode,'native');
});

test('update receipt only reports success for the running target version',async()=>{
 const h=setup({manifest:{version:'1.3.1',permissions:['storage']},state:{'halo-update-pending':{from:'1.3.0',target:'1.3.1'}}});
 h.installed({reason:'update'});await h.tick();assert.equal(h.state['halo-update-receipt'].ok,true);assert.equal(h.state['halo-update-receipt'].current,'1.3.1');assert.equal(h.state['halo-update-pending'],null);assert.equal(h.calls[0].url,'chrome-extension://test/update.html');
 const wrong=setup({state:{'halo-update-pending':{from:'1.2.2',target:'1.3.1'}}});wrong.installed({reason:'update'});await wrong.tick();assert.equal(wrong.state['halo-update-receipt'].ok,false);
});
test('web content cannot request local installer reload',async()=>{const h=setup();assert.equal((await h.send({type:'halo-complete-local-update',target:'1.3.1'},{id:'test',url:'https://www.youtube.com/watch?v=a'})).ok,false);assert.equal(h.calls.length,0);});
