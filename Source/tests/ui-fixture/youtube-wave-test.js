if(new URLSearchParams(location.search).has('test'))(async()=>{
 const results=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const check=(name,pass)=>{results.push({name,pass:!!pass});if(!pass)throw Error(name);};
 try {
  await sleep(800);const root=document.getElementById('halo-youtube-ui').shadowRoot,$=id=>root.getElementById(id),layer=document.getElementById('halo-youtube-layer');
  $('toggle').click();await sleep(300);$('enabled').click();await sleep(180);
  check('native renderer participates in opening wave',!layer.hidden&&!!document.getElementById('halo-page-wave'));
  check('wave clips the actual video light layer',getComputedStyle(layer).clipPath.startsWith('inset('));
  await sleep(1100);check('opening finishes with a clean live layer',!layer.hidden&&!document.getElementById('halo-page-wave')&&layer.style.clipPath==='');
  $('enabled').click();await sleep(160);check('light remains active during closing wave',!layer.hidden);
  await sleep(1250);check('closing removes theme and overlays',layer.hidden&&!document.documentElement.hasAttribute('data-halo-youtube')&&!document.getElementById('halo-page-wave'));
  check('site theme attribute is not changed',!document.documentElement.hasAttribute('dark'));
  $('enabled').click();await sleep(90);$('enabled').click();await sleep(1250);
  check('rapid reversal ends disabled without a stale layer',layer.hidden&&!document.getElementById('halo-page-wave'));
 } catch(error){results.push({name:error.message,pass:false});}
 document.body.dataset.waveResults=JSON.stringify(results);
})();
