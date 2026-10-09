const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const context={};vm.runInNewContext(fs.readFileSync(__dirname+'/../src/scripts/halo-video.js','utf8'),context);
const light=context.HaloVideo;
const pixels=(value)=>new Uint8ClampedArray(Array.from({length:144},()=>[value,value,value,255]).flat());
test('equal elapsed time gives equal temporal blending at 15, 30 and 60 fps',()=>{
 const residual=fps=>Math.pow(1-light.blend(1000/fps),fps);
 assert(Math.abs(residual(15)-residual(60))<1e-9);
 assert(Math.abs(residual(30)-residual(60))<1e-9);
 assert(light.blend(33)>0&&light.blend(33)<.4);
 assert.equal(light.blend(0),0);
});
test('black goes dark, dark scenes contract and bright peaks respect user brightness',()=>{
 assert.equal(light.exposure(pixels(0),100),0);
 assert(light.exposure(pixels(10),100)<.3);
 assert.equal(light.exposure(pixels(100),100),1);
 assert(light.exposure(pixels(255),180)<.5);
 assert.equal(light.exposure(pixels(100),80),1);
 const subtitles=pixels(100);subtitles.fill(255,0,4*4);
 assert.equal(light.exposure(subtitles,100),1);
});
test('sustained cost or scheduler delay lowers quality; single spikes do not',()=>{
 for(const [cost,lag] of [[8,0],[1,25]]){
  const q=light.createAdaptiveQuality();q.observe(0,cost,lag);assert.equal(q.fps,30);
  for(let now=100;now<=1000;now+=100)q.observe(now,cost,lag);
  assert.equal(q.fps,15);
  q.reset();q.observe(0,cost,lag);q.observe(100,1,0);assert.equal(q.fps,30);
 }
});
test('recovery requires twelve continuous healthy seconds and ignores hidden time',()=>{
 const q=light.createAdaptiveQuality();for(let now=0;now<=1000;now+=100)q.observe(now,8,0);
 q.observe(2000,1,0);q.observe(22000,1,0);assert.equal(q.fps,15);
 for(let now=22100;now<34000;now+=100)q.observe(now,1,0);
 assert.equal(q.fps,15);q.observe(34000,1,0);assert.equal(q.fps,30);
});
test('blocked readback falls back once, resets on source change, and restores alpha on draw errors',()=>{
 let reads=0;const probe={width:0,height:0,getContext:()=>({drawImage(){},getImageData(){reads++;throw Error('tainted');}})};
 context.document={createElement:()=>probe};
 const processor=light.createLightProcessor(),ctx={canvas:{width:320,height:180,style:{getPropertyValue(){},setProperty(){}}},drawImage(){}};
 processor.draw(ctx,{},0,100,true);processor.draw(ctx,{},150,100);assert.equal(reads,1);assert.equal(processor.limited,true);assert.equal(ctx.globalAlpha,1);
 processor.reset();processor.draw(ctx,{},300,100,true);assert.equal(reads,2);
 ctx.drawImage=()=>{throw Error('lost context')};assert.throws(()=>processor.draw(ctx,{},330,100));assert.equal(ctx.globalAlpha,1);
});

test('occasional expensive frames do not strand a healthy session in the low tier',()=>{
 const q=light.createAdaptiveQuality();for(let now=0;now<=1000;now+=100)q.observe(now,8,0);
 assert.equal(q.fps,15);
 for(let now=1100;now<=17000;now+=100)q.observe(now,now%2000===0?8:1,0);
 assert.equal(q.fps,30);
});
