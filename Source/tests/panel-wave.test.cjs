const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={};vm.runInNewContext(fs.readFileSync(__dirname+'/../src/scripts/halo-wave.js','utf8'),c);const {distance,expanded,reachOf,field}=c.HaloWave.geometry;
const panel={left:100,top:80,width:336,height:468,corner:24};
test('rounded wave begins on the four panel borders, not at the switch',()=>{
 for(const [x,y]of [[268,80],[436,314],[268,548],[100,314]])assert.equal(distance(panel,x,y),0);
 assert(distance(panel,100,80)>0);assert(distance(panel,268,314)<0);
});
test('parallel expansion preserves the border and rounded corner connection',()=>{
 for(const amount of [0,1,20,160,800]){
  const r=expanded(panel,amount);
  assert.equal(r.width,panel.width+2*amount);assert.equal(r.corner,panel.corner+amount);
  assert.equal(r.left+r.corner,panel.left+panel.corner);
  assert.equal(distance(panel,268,r.top),amount);
  const x=panel.left+panel.corner-(panel.corner+amount)/Math.sqrt(2),y=panel.top+panel.corner-(panel.corner+amount)/Math.sqrt(2);
  assert(Math.abs(distance(panel,x,y)-amount)<1e-9);
 }
});
test('completion reaches every viewport corner even from an off-center panel',()=>{
 const size={width:1440,height:900},reach=reachOf(panel,size),shape=expanded(panel,reach);
 for(const [x,y]of [[0,0],[1440,0],[0,900],[1440,900]])assert(distance(shape,x,y)<-110);
});
test('feather uses native gradient tiles without remote or per-frame image data',()=>{
 const paint=field(panel,120,{left:0,top:0,width:1440,height:900},'black');
 assert.equal((paint.image.match(/radial-gradient/g)||[]).length,4);
 assert.equal(paint.size.split(',').length,7);assert.equal(paint.position.split(',').length,7);
 assert.equal(paint.repeat,'no-repeat');assert(!/url|data:/.test(paint.image));
});
test('rapid reversals preserve value and velocity without restarting an ease-out',()=>{
 const advance=c.HaloWave.geometry.advance;
 let value=0,velocity=0,maxJump=0;const dt=1/60;
 for(let frame=0;frame<360;frame++){
  const target=Math.floor(frame/6)%2?0:1000;
  const prior={value,velocity};
  const immediate=advance(value,velocity,target,0,8);
  assert(Math.abs(immediate.value-prior.value)<1e-9);assert(Math.abs(immediate.velocity-prior.velocity)<1e-9);
  ({value,velocity}=advance(value,velocity,target,dt,8));maxJump=Math.max(maxJump,Math.abs(value-prior.value));assert(value>=0&&value<=1000);
 }
 // Peak speed of a critically damped full-range step is range * omega / e.
 assert(maxJump<=1000*8/Math.E*dt+1);
 for(let frame=0;frame<120;frame++)({value,velocity}=advance(value,velocity,0,dt,13));
 assert(value<.001&&Math.abs(velocity)<.001);
});
