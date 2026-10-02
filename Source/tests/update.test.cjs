const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(new URL('../src/scripts/halo-update.js',`file://${__filename}`),'utf8');
const context={URL,AbortController,setTimeout,clearTimeout};vm.createContext(context);vm.runInContext(source,context);const updates=context.HaloUpdates;
const store=()=>{const data={};return{data,get:async k=>({[k]:data[k]}),set:async v=>Object.assign(data,v)}};
const release=(tag='v1.0.10',url=`https://github.com/Elys1an-Y1san/Halo/releases/tag/${tag}`)=>({tag_name:tag,html_url:url,draft:false,prerelease:false});
const response=data=>({ok:true,status:200,json:async()=>Array.isArray(data)?data:[data]});
test('numeric versions, padding, prefixes and invalid prerelease',()=>{assert.equal(updates.compareVersions('v1.0.10','1.0.2'),1);assert.equal(updates.compareVersions('1.0.2.0','1.0.2'),0);assert.equal(updates.compareVersions('1.0.1','1.0.2'),-1);assert.throws(()=>updates.compareVersions('1.0.3-beta','1.0.2'));});
test('fixed anonymous request, valid result, cache and forced refresh',async()=>{let calls=0;const storage=store();const service=updates.create({storage,now:()=>1000,fetcher:async(url,options)=>{calls++;assert.equal(url,updates.endpoint);assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(options.headers.Authorization,undefined);return response(release());}});const first=await service.check('1.0.2');assert.equal(first.available,true);assert.equal(first.latest,'1.0.10');assert.equal(first.cached,false);assert.equal((await service.check('1.0.2')).cached,true);assert.equal(calls,1);await service.check('1.0.2',true);assert.equal(calls,2);});
test('concurrent clicks share one request and never duplicate fetch',async()=>{let resolve,calls=0;const service=updates.create({storage:store(),fetcher:()=>{calls++;return new Promise(r=>resolve=r)}});const a=service.check('1.0.2',true),b=service.check('1.0.2',true);assert.equal(a,b);resolve(response(release('v1.0.2')));const result=await a;assert.equal(result.available,false);assert.equal(calls,1);});
test('expired or corrupt cache triggers a fresh request',async()=>{const storage=store();storage.data['halo-release-cache-v1']={version:'1.0.2',url:'https://evil.example/',checkedAt:999};let calls=0;const service=updates.create({storage,now:()=>8*3600000,fetcher:async()=>{calls++;return response(release())}});assert.equal((await service.check('1.0.2')).ok,true);assert.equal(calls,1);});
for(const [name,data] of [['wrong origin',release('v1.0.10','https://evil.example/a')],['wrong repository',release('v1.0.10','https://github.com/other/repo/releases/tag/v1')],['draft',{...release(),draft:true}],['prerelease',{...release(),prerelease:true}],['malformed version',release('banana')]])test(`reject ${name}`,async()=>{const service=updates.create({storage:store(),fetcher:async()=>response(data)});const result=await service.check('1.0.2',true);assert.equal(result.ok,false);assert.equal(result.code,['draft','prerelease','malformed version'].includes(name)?'no_release':'invalid_release');});
for(const [status,code] of [[404,'no_release'],[403,'rate_limit'],[429,'rate_limit'],[500,'network']])test(`HTTP ${status} remains actionable`,async()=>{const service=updates.create({storage:store(),fetcher:async()=>({ok:false,status})});assert.equal((await service.check('1.0.2',true)).code,code);});
test('timeout aborts, clears pending state and permits retry',async()=>{let calls=0;const service=updates.create({storage:store(),timeoutMS:10,fetcher:(url,{signal})=>{calls++;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))))}});assert.equal((await service.check('1.0.2',true)).code,'network');assert.equal((await service.check('1.0.2',true)).code,'network');assert.equal(calls,2);});
test('cache write failure does not turn successful lookup into failure',async()=>{const storage=store();storage.set=async()=>{throw Error('quota')};const service=updates.create({storage,fetcher:async()=>response(release())});assert.equal((await service.check('1.0.2',true)).ok,true);});

test('highest stable version wins over publication order, drafts and prereleases',async()=>{
 const service=updates.create({storage:store(),fetcher:async()=>response([release('v1.0.4'),release('v1.0.10'),release('v1.0.9'),{...release('v2.0.0'),prerelease:true},{...release('v3.0.0'),draft:true}])});
 const result=await service.check('1.0.5',true);assert.equal(result.latest,'1.0.10');assert.equal(result.available,true);
});
test('manual refresh cannot join an in-flight cached automatic check',async()=>{
 let releaseRead;const storage=store();storage.get=()=>new Promise(r=>releaseRead=r);let calls=0;
 const service=updates.create({storage,now:()=>1000,fetcher:async()=>{calls++;return response(release('v1.0.10'))}});
 const auto=service.check('1.0.5');const manual=service.check('1.0.5',true);
 releaseRead({'halo-release-cache-v1':{version:'1.0.5',url:release('v1.0.5').html_url,checkedAt:999}});
 assert.equal((await auto).cached,true);assert.equal((await manual).latest,'1.0.10');assert.equal(calls,1);
});
test('empty publication list reports no release, never latest',async()=>{
 const service=updates.create({storage:store(),fetcher:async()=>response([])});
 assert.equal((await service.check('1.0.5',true)).code,'no_release');
});
