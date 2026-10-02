(async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const results = [];
  const check = (name, pass) => results.push({name, pass: Boolean(pass)});
  await wait(600);
  const root = document.querySelector('#bili-ambient-ui').shadowRoot;
  const input = name => root.getElementById(name);
  const set = (name, value) => {input(name).value = value; input(name).dispatchEvent(new Event('input', {bubbles:true}));};
  input('toggle').click();
  input('enabled').click(); await wait(1700);
  input('enabled').click(); await wait(2100);
  const canvas = document.querySelector('#bili-ambient-layer canvas');
  for (const [name, low, high] of [['brightness',20,180],['blur',0,100],['spread',0,200]]) {
    set(name, low); await wait(210); set(name, high); await wait(145);
    check(`${name}: stale acknowledgement does not revert the slider`, Number(input(name).value) === high);
    if (name === 'brightness') check('brightness: live renderer retains the latest filter',canvas.style.filter.includes('brightness(180%)'));
    if (name === 'blur') check('blur: live renderer retains nonzero blur',!canvas.style.filter.startsWith('blur(0px)'));
    if (name === 'spread') check('spread: live renderer keeps the expanded canvas',parseFloat(canvas.style.width)>document.querySelector('video').getBoundingClientRect().width*2.9);
    await wait(800);
    check(`${name}: latest value survives saving`,JSON.parse(localStorage.getItem('ambientlight-bilibili-v1'))[name] === high);
  }
  await chrome.storage.local.set({'ambientlight-bilibili-v1':{enabled:true,blur:40,spread:50,brightness:80,__haloSource:'another-panel'}});
  check('another panel still updates the controls and renderer',Number(input('brightness').value)===80&&canvas.style.filter.includes('brightness(80%)'));
  await chrome.storage.local.set({'ambientlight-bilibili-v1':{enabled:true,blur:60,spread:100,brightness:100}});
  check('legacy preferences still update the renderer',Number(input('blur').value)===60&&canvas.style.filter.includes('brightness(100%)'));
  const report = document.createElement('pre'); report.style.cssText='position:relative;background:#141619;color:#f2f3f4;padding:16px;white-space:pre-wrap'; report.id='parameter-results'; report.textContent=JSON.stringify(results,null,2);document.querySelector('main').prepend(report);
  document.body.dataset.parameterResults=JSON.stringify(results);
})();
