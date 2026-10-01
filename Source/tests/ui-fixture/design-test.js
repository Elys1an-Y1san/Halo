(async () => {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  while (!document.body.dataset.testResults) await sleep(25);
  const root = document.querySelector('#controls').shadowRoot;
  const $ = id => root.getElementById(id);
  const results = [];
  const check = (name, pass) => { results.push({ name, pass: !!pass }); if (!pass) throw Error(name); };
  try {
    check('popup fits 600px', document.body.getBoundingClientRect().height <= 600);
    check('no horizontal overflow', document.documentElement.scrollWidth <= innerWidth);
    await sleep(550);
    check('illustration and comparison removed', !$('preview') && !$('compare'));
    check('decorative descriptions removed', !root.textContent.includes('·') && !$('site-label') && $('status').textContent === '');
    $('spread').value = '123'; $('spread').dispatchEvent(new Event('input', { bubbles: true })); await sleep(40);
    check('custom preset readout', $('mode-label').textContent === '自定义' && !root.querySelector('[data-preset][aria-pressed="true"]'));
    check('range accessible value', $('spread').getAttribute('aria-valuetext') === '123%');
    check('range fill normalized', $('spread').style.getPropertyValue('--fill') === '61.5%');
    $('enabled').click(); await sleep(40);
    check('switch visual state follows preference', $('power').dataset.enabled === 'false' && !$('enabled').checked);
    const off = $('power-effect').getAnimations();
    check('switch off plays contraction', matchMedia('(prefers-reduced-motion: reduce)').matches ? off.length === 0 : off.length === 1 && off[0].effect.getTiming().duration === 360);
    await Promise.all(off.map(animation=>animation.finished.catch(()=>{})));
    check('switch effect ends cleanly', $('power-effect').getAnimations().length === 0);
    $('enabled').click(); await sleep(30);
    const on = $('power-effect').getAnimations();
    check('switch on plays expansion', matchMedia('(prefers-reduced-motion: reduce)').matches ? on.length === 0 : on.length === 1 && on[0].effect.getTiming().duration === 520);
    $('enabled').click(); $('enabled').click();
    check('rapid switching keeps at most one effect', $('power-effect').getAnimations().length <= 1);
    const set = chrome.storage.local.set;
    chrome.storage.local.set = async () => { throw Error('simulated storage failure'); };
    $('reset').click(); await sleep(40);
    check('save failure is visible', $('status').textContent.includes('保存失败'));
    chrome.storage.local.set = set;
    $('reset').click(); await sleep(40);
    check('recovery saves default values', JSON.parse(localStorage.getItem('halo-youtube-v1')).spread === 100);
    const nativeQuery = chrome.tabs.query;
    chrome.tabs.query = async () => { throw Error('unsupported tab'); };
    document.querySelector('#open-page').click(); await sleep(40);
    check('unsupported page gives actionable status', $('status').textContent.includes('刷新'));
    chrome.tabs.query = nativeQuery;
    $('reset').click();
  } catch (error) {
    results.push({name: error.message, pass: false});
  } finally {
    document.body.dataset.designResults = JSON.stringify(results);
  }
})();
