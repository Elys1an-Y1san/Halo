const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const context={};vm.runInNewContext(fs.readFileSync(`${__dirname}/../src/scripts/x-player.js`,'utf8'),context);const policy=context.HaloX;
test('X supports feed, profile and media routes on exact current and legacy hosts',()=>{
 for(const host of ['x.com','www.x.com','twitter.com','www.twitter.com'])for(const route of ['/home','/person','/person/status/123/video/1','/i/bookmarks'])assert.equal(policy.supports(new URL(`https://${host}${route}`)),true);
 for(const url of ['https://notx.com/home','https://x.com.evil.test/home','https://x.com/i/flow/login','https://x.com/settings/privacy','https://x.com/i/jf/onboarding/web'])assert.equal(policy.supports(new URL(url)),false);
});
const candidate={rect:{left:0,top:0,right:640,bottom:360,width:640,height:360},viewportWidth:1280,viewportHeight:720,visible:true,connected:true,playing:true,ready:true};
test('X excludes offscreen and hidden videos, prioritizes visible playing video and media dialog',()=>{
 assert.equal(policy.rank({...candidate,visible:false}),-Infinity);
 assert.equal(policy.rank({...candidate,rect:{...candidate.rect,top:1000,bottom:1360}}),-Infinity);
 assert.ok(policy.rank(candidate)>policy.rank({...candidate,playing:false}));
 assert.ok(policy.rank({...candidate,modal:true,playing:false})>policy.rank(candidate));
});
