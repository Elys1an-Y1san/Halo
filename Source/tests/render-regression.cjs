const fs = require('fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('path').join(__dirname, '../src/scripts/libs/ambientlight.js'), 'utf8');
const assignment = source.slice(source.indexOf('    this.filterElem.style.filter ='), source.indexOf('    this.srcVideoOffset =', source.indexOf('    this.filterElem.style.filter =')));
const filter = new Function('CanvasRenderingContext2D', 'contrast', 'brightness', 'saturation', assignment);
function getFilter(blur2, support, webGL=true) {
  const target={settings:{blur2,webGL},videoOffset:{height:1080},filterElem:{style:{}}};
  filter.call(target,{prototype:support?{filter:'none'}:{}},100,100,100);
  return target.filterElem.style.filter;
}
assert.equal(getFilter(0,false),'');
assert.equal(getFilter(20,false),'blur(54px)');
assert.equal(getFilter(60,false),'blur(162px)');
assert.equal(getFilter(60,true),''); // No double blur when the native path works.
assert.equal(getFilter(60,true,false),'blur(162px)');
function method(name,next) {const start=source.indexOf(`  ${name}(`); const end=source.indexOf(`\n  ${next}`,start);return new Function(`return ({${source.slice(start,end)}}).${name}`)();}
const recreate=method('recreateProjectors','clear(');
const resize=method('resizeCanvasses','updatedSizesChanged');
function extent(spread){let scale;const target={settings:{spread,edge:12},innerStrength:1,p:{w:256,h:144},clippedVideoScale:[1,1],barsClip:[0,0],projector:{rescale:(_,s)=>scale={...s}}};recreate.call(target);resize.call(target);return scale;}
const low=extent(17),high=extent(120);
assert(high.x>low.x && high.y>low.y);
console.log(JSON.stringify({pass:true,blurPixels:[getFilter(0,false),getFilter(20,false),getFilter(60,false)],spread:{low,high}},null,2));
