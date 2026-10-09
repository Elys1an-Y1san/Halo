(async () => {
  await new Promise(r => setTimeout(r, 800));
  const results = [], check = (name, pass) => results.push({name, pass: !!pass});
  check('exactly one panel after overlapping initialization', document.querySelectorAll('#bili-ambient-ui').length === 1);
  check('exactly one renderer after overlapping initialization', document.querySelectorAll('#bili-ambient-layer').length === 1);
  const root = document.querySelector('#bili-ambient-ui').shadowRoot;
  const canvas = document.querySelector('#bili-ambient-layer canvas');
  for (const [name, value] of [['brightness',20], ['blur',0], ['spread',0]]) {
    const input = root.getElementById(name);
    input.value = value; input.dispatchEvent(new Event('change', {bubbles:true}));
    check(name + ': change-only input updates displayed value', root.getElementById(name+'-value').value === String(value));
  }
  check('change-only input reaches the live renderer', canvas.style.filter === 'blur(0px) brightness(calc(20% * var(--halo-tone, 1)))' && parseFloat(canvas.style.width) === document.querySelector('video').getBoundingClientRect().width);
  await new Promise(r => setTimeout(r, 500));
  const saved = JSON.parse(localStorage.getItem('ambientlight-bilibili-v1'));
  check('change-only input persists', saved.brightness === 20 && saved.blur === 0 && saved.spread === 0);
  document.body.dataset.duplicateResults = JSON.stringify(results);
  const report = document.createElement('pre'); report.textContent=JSON.stringify(results,null,2); document.querySelector('main').prepend(report);
})();
