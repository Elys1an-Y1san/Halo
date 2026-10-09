const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const code=fs.readFileSync(new URL('../src/scripts/halo-ui.js',`file://${__filename}`),'utf8');
const context={document:{body:{dataset:{}},documentElement:{hasAttribute:()=>false}},innerWidth:1280,innerHeight:720};
vm.runInNewContext(code,context);
const ui=context.HaloUI;
test('legacy and corrupt preferences normalize without losing valid light settings',()=>{
 const legacy=ui.normalize({enabled:false,brightness:81});
 assert.equal(legacy.enabled,false);assert.equal(legacy.brightness,81);assert.equal(legacy.quality,'balanced');
 const corrupt=ui.normalize({blur:Infinity,spread:-9,brightness:999,quality:'constructor',profiles:[null,{name:'safe',brightness:40}]});
 assert.equal(corrupt.blur,60);assert.equal(corrupt.spread,0);assert.equal(corrupt.brightness,180);assert.equal(corrupt.quality,'balanced');assert.equal(corrupt.profiles.length,1);
});
test('profiles have bounded names and count',()=>{
 const value=ui.normalize({profiles:Array.from({length:50},()=>({name:'x'.repeat(100),blur:500}))});
 assert.equal(value.profiles.length,12);assert.equal(value.profiles[0].name.length,24);assert.equal(value.profiles[0].blur,100);
});
test('automatic placement chooses the side outside a right-aligned player',()=>{
 const host={dataset:{},style:{},shadowRoot:{getElementById:()=>({hidden:false,getBoundingClientRect:()=>({height:468})})}};
 ui.place(host,{position:'auto'},{getBoundingClientRect:()=>({left:700,right:1200,top:60,bottom:650})});
 assert.equal(host.dataset.side,'left');assert.equal(host.style.left,'24px');
});
test('automatic placement moves above a low player when side placement overlaps',()=>{
 const host={dataset:{},style:{},shadowRoot:{getElementById:()=>({hidden:true})}};
 ui.place(host,{position:'auto'},{getBoundingClientRect:()=>({left:0,right:1280,top:200,bottom:720})});
 assert.equal(host.dataset.top,'true');assert.equal(host.style.top,'24px');
});
test('drag anchors are bounded and corrupt saved coordinates are discarded',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(ui.normalize({anchor:{x:-5,y:5}}).anchor)),{x:0,y:1});
 assert.equal(ui.normalize({anchor:{x:NaN,y:1}}).anchor,null);
 assert.equal(ui.normalize({anchor:{x:'0.5',y:1}}).anchor,null);
});
