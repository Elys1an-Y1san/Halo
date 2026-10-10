(async () => {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  while (!document.body.dataset.testResults) await sleep(25);
  const root = document.querySelector('#controls').shadowRoot;
  const $ = id => root.getElementById(id);
  const results = [];
  const check = (name, pass) => { results.push({ name, pass: !!pass }); if (!pass) throw Error(name); };
  try {
    check('popup fits a standard 600px window', document.body.getBoundingClientRect().height <= 520);
    const views=root.querySelector('.views');
    check('main controls need no scrolling',views.scrollHeight <= views.clientHeight+1);
    const height=document.body.getBoundingClientRect().height;
    check('only light and preferences remain',root.querySelectorAll('[role=tab]').length===2&&!$('tab-profiles')&&!$('profiles'));
    $('tab-settings').click();
    check('preferences has a dedicated view',!$('view-settings').hidden && $('view-light').hidden);
    check('view switching preserves popup height',document.body.getBoundingClientRect().height===height);
    $('tab-settings').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
    check('tabs support arrow navigation',root.activeElement===$('tab-light') && $('tab-light').getAttribute('aria-selected')==='true');
    $('tab-light').click();
    check('no horizontal overflow', document.documentElement.scrollWidth <= innerWidth);
    await sleep(550);
    check('temporary comparison available', !$('preview') && !!$('compare'));
    check('runtime status available', !!$('runtime-status').textContent);
    $('spread').value = '123'; $('spread').dispatchEvent(new Event('input', { bubbles: true })); await sleep(40);
    check('custom preset readout', $('mode-label').textContent === '自定义' && !root.querySelector('[data-preset][aria-pressed="true"]'));
    check('range accessible value', $('spread').getAttribute('aria-valuetext') === '123%');
    check('range fill normalized', $('spread').style.getPropertyValue('--fill') === '61.5%');
    if (!$('enabled').checked) $('enabled').click();
    await sleep(400);
    $('enabled').click(); await sleep(40);
    check('switch visual state follows preference', $('power').dataset.enabled === 'false' && !$('enabled').checked);
    check('switch off clears panel diffusion state', $('panel-aura').dataset.lit === 'false');
    check('popup does not paint an external panel glow', getComputedStyle($('panel-aura')).display === 'none');
    $('enabled').click(); await sleep(30);
    check('switch on sets panel diffusion state', $('panel-aura').dataset.lit === 'true');
    $('enabled').click(); $('enabled').click();
    check('rapid switching keeps final state without the old switch flare', $('panel-aura').dataset.lit === 'true' && !$('power-effect'));
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
