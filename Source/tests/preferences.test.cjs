const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const {webcrypto} = require('node:crypto');
const source = fs.readFileSync(new URL('../src/scripts/halo-controls.js', `file://${__filename}`),'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup() {
  const ids = new Map(), writes = [];
  let storageListener;
  function element(id) {
    if (!ids.has(id)) {
      const handlers = {}, attrs = new Map();
      ids.set(id,{id, value:'0', min:'0', max:id==='brightness'?'180':'200', checked:true,
        handlers, hidden:false, style:{setProperty(){}},
        addEventListener(type, fn) {handlers[type]=fn;},
        dispatchEvent(event) {handlers[event.type]?.(event);},
        getAttribute(name) {return attrs.get(name);},
        setAttribute(name, value) {attrs.set(name,value);},
        click() {attrs.set('aria-checked',String(attrs.get('aria-checked')!=='true'));},
        focus(){}});
    }
    return ids.get(id);
  }
  element('setting-enabled').setAttribute('aria-checked','true');
  const root={getElementById:element,querySelectorAll:()=>[],addEventListener(){}};
  const host={attachShadow:()=>root};
  const api={runtime:{getManifest:()=>({version:'test'}),onMessage:{addListener(){}}},storage:{local:{get:async()=>({}),set(value){return new Promise(resolve=>writes.push({value,resolve}));}},onChanged:{addListener(fn){storageListener=fn;}}}};
  const document={body:{dataset:{}},documentElement:{append(){},hasAttribute:()=>true},createElement:()=>host,querySelector:()=>({}),getElementById:element,addEventListener(){}};
  const context={chrome:api,document,crypto:webcrypto,Event:class{constructor(type){this.type=type;}},MutationObserver:class{observe(){}},setTimeout,
    HaloUI:{css:'',markup:'',bindUpdates(){},createPanel:()=>({isOpen:false,setOpen(){}}),sync(_,settings){for(const key of ['blur','spread','brightness'])element(key).value=String(settings[key]);element('enabled').checked=settings.enabled;}},
    HaloWave:{create(){return {renderingEnabled:true,setInitial(value){this.renderingEnabled=value;},toggle(value,commit){this.renderingEnabled=value;commit();}};}}};
  vm.runInNewContext(source,context);
  return {element,writes,notify:value=>storageListener({'halo-youtube-v1':{newValue:value}},'local'),set(name,value){element(name).value=String(value);element(name).handlers.input();}};
}
test('a delayed own acknowledgement cannot revert a newer UI edit or renderer value',async()=>{
  const h=setup();await tick();
  h.set('brightness',20);await tick();h.set('brightness',180);await tick();
  assert.equal(h.writes.length,1,'writes are serialized');
  const first=h.writes[0].value['halo-youtube-v1'];h.notify(first);
  assert.equal(h.element('brightness').value,'180');
  assert.equal(h.element('setting-brightness-range').value,180);
  h.writes[0].resolve();await tick();
  assert.equal(h.writes.length,2);
  const second=h.writes[1].value['halo-youtube-v1'];assert.equal(second.brightness,180);
  assert.equal(first.__haloSource,second.__haloSource);h.notify(second);h.writes[1].resolve();await tick();
});
test('changes from another panel still reach the UI and renderer',async()=>{
  const h=setup();await tick();h.notify({enabled:false,blur:72,spread:150,brightness:90,__haloSource:'another-panel'});
  assert.equal(h.element('enabled').checked,false);
  assert.equal(h.element('setting-enabled').getAttribute('aria-checked'),'false');
  assert.equal(h.element('setting-blur2-range').value,72);
  assert.equal(h.element('setting-spread-range').value,150);
  assert.equal(h.element('setting-brightness-range').value,90);
});
test('existing settings without a source marker remain compatible',async()=>{
  const h=setup();await tick();h.notify({enabled:true,blur:40,spread:50,brightness:80});
  assert.equal(h.element('blur').value,'40');assert.equal(h.element('setting-brightness-range').value,80);
});
