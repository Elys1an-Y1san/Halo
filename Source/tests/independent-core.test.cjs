const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
test('all sites load only the independent isolated Halo engine',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'src/manifest.json')));
 for(const entry of manifest.content_scripts){
  assert.equal(entry.world,undefined);
  assert(entry.js.includes('scripts/halo-engine.js'));
  assert(entry.js.includes('scripts/halo-video.js'));
  assert(!entry.js.some(name=>/injected|content-main|content\.js/.test(name)));
 }
 assert.equal(manifest.web_accessible_resources,undefined);
 const scripts=fs.readdirSync(path.join(root,'src/scripts'));
 assert(!scripts.includes('libs'));
 for(const name of scripts){
  const source=fs.readFileSync(path.join(root,'src/scripts',name),'utf8');
  assert(!/setting-enabled|ambientlight__|sentry|ambientlight-safari-bridge/i.test(source),name);
 }
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
 assert.deepEqual(pkg.dependencies||{},{});
 assert(!Object.keys(pkg.devDependencies).some(name=>/sentry|rollup|babel/.test(name)));
});
test('YouTube routes support delayed watch, live, Shorts and embed players',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'src/scripts/youtube-player.js'),'utf8'),c);
 for(const part of ['/watch?v=test','/shorts/test','/live/test','/embed/test'])assert(c.HaloYouTube.supports(new URL('https://www.youtube.com'+part)),part);
 for(const url of ['https://www.youtube.com/','https://www.youtube.com/watch','https://www.youtube.com/live_chat?v=test','https://youtube.com.evil/watch?v=test'])assert(!c.HaloYouTube.supports(new URL(url)),url);
 const candidate={rect:{width:640,height:360,left:0,right:640,top:0,bottom:360},viewportWidth:1280,viewportHeight:720,visible:true,connected:true,primary:true,ready:true};
 assert(Number.isFinite(c.HaloYouTube.rank(candidate)));
 assert.equal(c.HaloYouTube.rank({...candidate,mini:true}),-Infinity);
 assert.equal(c.HaloYouTube.rank({...candidate,visible:false}),-Infinity);
});
