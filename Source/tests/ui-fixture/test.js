(async()=>{
 const wait=()=>new Promise(r=>setTimeout(r,250));await wait();
 await chrome.storage.local.set({'halo-youtube-v1':{enabled:true,blur:60,spread:100,brightness:100},'ambientlight-bilibili-v1':{enabled:true,blur:60,spread:100,brightness:100}});await wait();
 const s=document.querySelector('#controls').shadowRoot;
 const results=[];const check=(name,ok)=>{results.push({name,pass:!!ok});if(!ok)throw Error(name);};
 s.querySelector('[data-preset="soft"]').click();await wait();
 check('soft preset',s.querySelector('#blur').value==='40'&&s.querySelector('#spread').value==='50'&&s.querySelector('#brightness').value==='80');
 document.querySelector('#site').value='bilibili';document.querySelector('#site').dispatchEvent(new Event('change'));await wait();
 s.querySelector('[data-preset="wide"]').click();await wait();
 document.querySelector('#site').value='youtube';document.querySelector('#site').dispatchEvent(new Event('change'));await wait();
 check('website isolation',s.querySelector('#blur').value==='40');
 s.querySelector('#enabled').click();await wait();check('toggle persisted',JSON.parse(localStorage.getItem('halo-youtube-v1')).enabled===false);
 s.querySelector('#reset').click();await wait();check('reset',s.querySelector('#blur').value==='60'&&!s.querySelector('#enabled').checked);
 document.body.dataset.testResults=JSON.stringify(results);
})();
