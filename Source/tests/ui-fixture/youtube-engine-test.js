(async()=>{
 const results=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const check=(name,pass)=>{results.push({name,pass:!!pass});document.body.dataset.engineProgress=name;if(!pass)throw Error(name);};
 const until=async fn=>{for(let i=0;i<180;i++){if(fn())return;await sleep(30);}throw Error('Timed out waiting for video');};
 const layer=()=>document.getElementById('halo-youtube-layer');
 let originalDraw,context;
 try {
  await sleep(200);
  const host=document.getElementById('halo-youtube-ui'),root=host.shadowRoot,$=id=>root.getElementById(id);
  check('engine starts without injected scripts or legacy controls',!!host&&!document.querySelector('[id^="setting-"],.ambientlight__container'));
  await sleep(1800);
  check('slow initial video load remains waiting instead of showing an error',layer().hidden&&$('runtime-status').textContent.includes('等待'));
  await until(()=>!layer().hidden);
  check('late video becomes ready without refreshing',document.documentElement.hasAttribute('data-halo-youtube'));
  const edit=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new Event('change'));};
  edit('blur',72);edit('brightness',130);edit('spread',150);await sleep(180);
  check('preferences drive actual canvas geometry',layer().querySelector('canvas').style.filter.includes('brightness(130%)'));
  check('site preferences retain existing storage key',JSON.parse(localStorage.getItem('halo-youtube-v1')).blur===72);
  $('toggle').click();await sleep(300);$('compare').click();await sleep(50);
  check('comparison hides only Halo rendering',layer().hidden&&JSON.parse(localStorage.getItem('halo-youtube-v1')).enabled);
  $('compare').click();await until(()=>!layer().hidden);
  let video=document.querySelector('video');video.pause();
  check('paused video keeps last light frame',!layer().hidden);
  context=layer().querySelector('canvas').getContext('2d');originalDraw=context.drawImage;
  context.drawImage=()=>{throw new DOMException('Blocked test media','SecurityError');};
  video.dispatchEvent(new Event('seeked'));await sleep(50);
  check('unreadable frame hides stale light',layer().hidden);
  check('sampling failure stays inside Halo panel',$('runtime-status').textContent.includes('读取')&&!document.querySelector('.ytp-ambientlight-settings-button,.ambientlight__error'));
  context.drawImage=originalDraw;$('retry').click();await until(()=>!layer().hidden);
  check('retry recovers rendering without reloading the video',!layer().hidden&&video.paused);
  let mediaError={code:3};Object.defineProperty(video,'error',{configurable:true,get:()=>mediaError});video.dispatchEvent(new Event('error'));await sleep(50);
  check('media decoding error stops glow',layer().hidden&&$('runtime-status').textContent.includes('播放器'));
  mediaError=null;video.dispatchEvent(new Event('canplay'));await until(()=>!layer().hidden);
  check('media recovery resumes automatically',!layer().hidden);
  const next=document.createElement('video');next.muted=true;next.autoplay=true;next.playsInline=true;next.style.cssText=video.style.cssText;next.srcObject=video.srcObject;video.replaceWith(next);document.getElementById('source').getContext('2d').drawImage(document.getElementById('source'),0,0);await Promise.race([next.play(),sleep(3000).then(()=>{if(next.paused)throw Error('Replacement playback did not start');})]);await until(()=>!layer().hidden);await sleep(200);
  check('replacement player reconnects without duplicate engine',document.querySelectorAll('#halo-youtube-ui').length===1&&document.querySelectorAll('#halo-youtube-layer').length===1&&!layer().hidden);
  history.pushState({},'', '/not-a-video');document.dispatchEvent(new Event('yt-navigate-finish'));await sleep(50);
  check('SPA navigation away releases page theme',layer().hidden&&!document.documentElement.hasAttribute('data-halo-youtube'));
  history.pushState({},'', '/youtube-engine.html');document.dispatchEvent(new Event('yt-navigate-finish'));await until(()=>!layer().hidden);
  check('SPA return restores existing preferences',!layer().hidden&&$('brightness').value==='130');
  document.getElementById('movie_player').classList.add('ytp-player-minimized');await sleep(50);
  check('YouTube mini player suspends glow',layer().hidden);
  document.getElementById('movie_player').classList.remove('ytp-player-minimized');await until(()=>!layer().hidden);
  check('return from mini player restores glow',!layer().hidden);
  let failures=0;context.drawImage=()=>{failures++;throw new DOMException('Temporary test frame','InvalidStateError');};
  await until(()=>layer().hidden && !$('retry').hidden);await sleep(800);
  check('frame callback errors publish recoverable status',$('runtime-status').textContent.includes('读取'));
  check('repeated frame errors stop sampling instead of spinning',failures<=3);
  context.drawImage=originalDraw;$('retry').click();await until(()=>!layer().hidden);
  check('frame scheduler resumes after retry',!layer().hidden);

 } catch(error){results.push({name:error.message,pass:false});}
 finally {if(context&&originalDraw)context.drawImage=originalDraw;document.body.dataset.engineResults=JSON.stringify(results);}
})();
