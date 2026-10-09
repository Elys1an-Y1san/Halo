(async()=>{
 const results=[],frame=document.getElementById('target'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const check=(name,pass)=>{results.push({name,pass:!!pass});document.getElementById('results').textContent=JSON.stringify(results,null,2);if(!pass)throw Error(name);};
 const load=async url=>{frame.src=url;await new Promise(r=>frame.onload=r);await sleep(350);return frame.contentWindow;};
 try{
  let w=await load('preview.html'),root=w.document.getElementById('controls').shadowRoot,$=id=>root.getElementById(id);
  const edit=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('change'));};
  $('enabled').checked=false;$('enabled').dispatchEvent(new w.Event('change'));
  edit('brightness-number','137');$('reset').click();
  check('reset preserves disabled switch',!$('enabled').checked && $('brightness').value==='100');
  $('undo').click();check('undo restores exact previous values',$('brightness').value==='137'&&!$('enabled').checked);
  edit('brightness-number','999');check('numeric value clamps to range',$('brightness').value==='180');
  edit('brightness-number','');check('empty input restores current value',$('brightness-number').value==='180');
  $('profile-name').value='夜间观影';$('save-profile').click();await sleep(100);
  check('named profile saved',$('profiles').selectedOptions[0].textContent==='夜间观影');
  root.querySelector('[data-preset=soft]').click();$('last-custom').click();check('last custom survives preset switch',$('brightness').value==='180');
  root.querySelector('[data-preset=cinema]').click();edit('profiles','0');check('saved profile applies parameters',$('brightness').value==='180');
  $('delete-profile').click();check('delete removes selected profile',$('profiles').options.length===1);$('undo').click();check('undo recovers deleted profile',$('profiles').options.length===2);
  edit('quality','eco');edit('position','left');await sleep(150);
  const saved=JSON.parse(w.localStorage.getItem('halo-youtube-v1'));
  check('quality and position persist',saved.quality==='eco'&&saved.position==='left');
  w=await load('preview.html');root=w.document.getElementById('controls').shadowRoot;
  check('profiles and preferences survive reopen',$('profiles').options.length===2&&$('quality').value==='eco'&&$('position').value==='left');
  w.document.getElementById('site').value='bilibili';w.document.getElementById('site').dispatchEvent(new w.Event('change'));await sleep(100);
  check('site change clears undo',$('undo').disabled);
  check('unconnected popup shows actionable status',$('runtime-status').textContent.length>0);
  w=await load('panel.html');root=w.document.getElementById('halo-youtube-ui').shadowRoot;
  edit('quality','smooth');check('renderer receives actual sampling limit',w.document.getElementById('setting-framerateLimit-range').value==='60');
  $('enabled').checked=true;$('enabled').dispatchEvent(new w.Event('change'));await sleep(1000);
  $('compare').click();await sleep(50);check('comparison disables renderer',w.document.getElementById('setting-enabled').getAttribute('aria-checked')==='false');
  check('comparison does not persist disabled state',JSON.parse(w.localStorage.getItem('halo-youtube-v1')).enabled);
  $('tab-profiles').click();await sleep(30);check('changing view ends temporary comparison',w.document.getElementById('setting-enabled').getAttribute('aria-checked')==='true');
  $('tab-light').click();$('compare').click();await sleep(30);
  w.dispatchEvent(new w.Event('blur'));await sleep(30);check('focus loss restores renderer',w.document.getElementById('setting-enabled').getAttribute('aria-checked')==='true');
  edit('position','left');check('left position applied',root.host.dataset.side==='left');
  edit('position','right');check('right position applied',root.host.dataset.side==='right');
  w=await load('bilibili-panel.html');root=w.document.getElementById('bili-ambient-ui').shadowRoot;
  await sleep(7500); // Allow the existing adapter smoke test to finish first.
  $('enabled').checked=true;$('enabled').dispatchEvent(new w.Event('change'));await sleep(1000);
  const before=JSON.parse(w.localStorage.getItem('ambientlight-bilibili-v1'));
  $('compare').click();await sleep(80);check('adapter comparison hides ambient layer',w.document.getElementById('bili-ambient-layer').hidden);
  check('adapter comparison preserves preferences',JSON.stringify(before)===w.localStorage.getItem('ambientlight-bilibili-v1'));
  $('compare').click();await sleep(80);check('adapter comparison restores ambient layer',!w.document.getElementById('bili-ambient-layer').hidden);
  edit('quality','eco');await sleep(200);check('adapter quality persists',JSON.parse(w.localStorage.getItem('ambientlight-bilibili-v1')).quality==='eco');
  const source=w.document.getElementById('source'),ctx=source.getContext('2d'),video=w.document.querySelector('video');
  video.srcObject=source.captureStream(60);
  let phase=0;const animate=w.setInterval(()=>{ctx.fillStyle=phase++%2?'#a87f56':'#6489a1';ctx.fillRect(0,0,640,360);},16);await video.play();
  const target=w.document.querySelector('#bili-ambient-layer canvas').getContext('2d'),draw=target.drawImage;
  let draws=0;target.drawImage=function(...args){draws++;return draw.apply(this,args);};
  const rates={};
  for(const mode of ['eco','balanced','smooth']){edit('quality',mode);await sleep(300);draws=0;await sleep(1100);rates[mode]=draws/1.1;}
  w.clearInterval(animate);target.drawImage=draw;
  check('sampling limits hold: '+JSON.stringify(rates),rates.eco<=17&&rates.balanced<=32&&rates.smooth<=62);
  check('higher quality actually samples more frames',rates.eco>0&&rates.smooth>rates.eco*1.4);

 }catch(e){results.push({name:e.message,pass:false});}
 finally{document.body.dataset.featureResults=JSON.stringify(results);document.getElementById('results').textContent=JSON.stringify(results,null,2);}
})();
