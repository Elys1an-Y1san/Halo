const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const {webcrypto} = require('node:crypto');
const source = fs.readFileSync(new URL('../src/scripts/halo-controls.js', `file://${__filename}`),'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup({get = async()=>({})} = {}) {
  const ids = new Map(), writes = [];
  let storageListener;
  function element(id) {
    if (!ids.has(id)) {
      const handlers = {}, attrs = new Map();
      ids.set(id,{id, value:'0', min:'0', max:id==='brightness'?'180':'200', checked:true,
        handlers, hidden:false, style:{setProperty(){}},
        addEventListener(type, fn) {handlers[type]=fn;},
        dispatchEvent(event) {handlers[event.type]?.(event);this['on'+event.type]?.(event);},
        getAttribute(name) {return attrs.get(name);},
        setAttribute(name, value) {attrs.set(name,value);},
        click() {attrs.set('aria-checked',String(attrs.get('aria-checked')!=='true'));},
        focus(){}});
    }
    return ids.get(id);
  }
  const root={getElementById:element,querySelectorAll:()=>[],addEventListener(){}};
  const host={attachShadow:()=>root};
  const api={tabs:{query:async()=>[{id:1,url:'https://www.youtube.com/watch?v=test'}],sendMessage:async()=>({status:'ready',ok:true})},runtime:{getManifest:()=>({version:'test'}),onMessage:{addListener(){}}},storage:{local:{get,set(value){return new Promise(resolve=>writes.push({value,resolve}));}},onChanged:{addListener(fn){storageListener=fn;}}}};
  const document={body:{dataset:{}},documentElement:{append(){},hasAttribute:()=>true},createElement:()=>host,querySelector:selector=>selector==='#controls'?host:element(selector.slice(1)),getElementById:id=>id==='halo-youtube-ui'?null:element(id),addEventListener(){}};
  const context={window:{addEventListener(){}},setInterval:()=>0,clearInterval(){},clearTimeout,chrome:api,document,crypto:webcrypto,Event:class{constructor(type){this.type=type;}},MutationObserver:class{observe(){}},setTimeout,
    HaloUI:{css:'',markup:'',bindUpdates(){},createPanel:()=>({isOpen:false,setOpen(){}}),sync(_,settings){for(const key of ['blur','spread','brightness'])element(key).value=String(settings[key]);element('enabled').checked=settings.enabled;}},
    HaloWave:{create(){return {renderingEnabled:true,setInitial(value){this.renderingEnabled=value;},toggle(value,commit){this.renderingEnabled=value;commit();}};}}};
  const uiContext={};vm.runInNewContext(fs.readFileSync(new URL('../src/scripts/halo-ui.js', `file://${__filename}`),'utf8'),uiContext);
  context.HaloUI={...uiContext.HaloUI,...context.HaloUI,place(){},runtime(){}};
  // Bind the real shared editor in this test's document/window context.
  const shared=fs.readFileSync(new URL('../src/scripts/halo-ui.js', `file://${__filename}`),'utf8');
  const sandbox=vm.createContext(context), overrides=context.HaloUI;
  vm.runInContext(shared,sandbox);Object.assign(context.HaloUI,{sync:overrides.sync,bindUpdates:overrides.bindUpdates,createPanel:overrides.createPanel,place(){},runtime(){}});
  vm.runInContext(source,sandbox);
  return {element,writes,notify:value=>storageListener({'halo-youtube-v1':{newValue:value}},'local'),set(name,value){element(name).value=String(value);element(name).oninput();}};
}
test('a delayed own acknowledgement cannot revert a newer UI edit or current value',async()=>{
  const h=setup();await tick();
  h.set('brightness',20);await tick();h.set('brightness',180);await tick();
  assert.equal(h.writes.length,1,'writes are serialized');
  const first=h.writes[0].value['halo-youtube-v1'];h.notify(first);
  assert.equal(h.element('brightness').value,'180');
  h.writes[0].resolve();await tick();
  assert.equal(h.writes.length,2);
  const second=h.writes[1].value['halo-youtube-v1'];assert.equal(second.brightness,180);
  assert.equal(first.__haloSource,second.__haloSource);h.notify(second);h.writes[1].resolve();await tick();
});
test('changes from another panel still reach the UI',async()=>{
  const h=setup();await tick();h.notify({enabled:false,blur:72,spread:150,brightness:90,__haloSource:'another-panel'});
  assert.equal(h.element('enabled').checked,false);
  assert.equal(h.element('blur').value,'72');assert.equal(h.element('spread').value,'150');assert.equal(h.element('brightness').value,'90');
});
test('existing settings without a source marker remain compatible',async()=>{
  const h=setup();await tick();h.notify({enabled:true,blur:40,spread:50,brightness:80});
  assert.equal(h.element('blur').value,'40');assert.equal(h.element('brightness').value,'80');
});

test('late initial storage read cannot undo a parameter edit', async()=>{
 let resolve;const h=setup({get:()=>new Promise(r=>resolve=r)});
 h.set('brightness',175);resolve({'halo-youtube-v1':{brightness:30}});await tick();
 assert.equal(h.element('brightness').value,'175');
 h.writes[0].resolve();await tick();
});
test('change-only range input applies and saves exactly once',async()=>{
 const h=setup();await tick();const input=h.element('brightness');input.value='160';input.onchange();input.oninput();await tick();
 assert.equal(h.element('brightness').value,'160');assert.equal(h.writes.length,1);h.writes[0].resolve();await tick();assert.equal(h.writes.length,1);
});
