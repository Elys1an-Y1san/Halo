(async()=>{
 const cases=[['youtubeEngine','youtube-engine.html','engineResults'],['bilibiliMini','bilibili-mini.html','miniResults'],['closingTail','wave.html?tailtest=1','tailResults'],['xAdapter','x-test.html','xResults'],['xPopup','x-popup.html','xPopupResults'],['duplicate','duplicate-init.html','duplicateResults'],['parameters','parameter-race.html','parameterResults'],['updates','update-test.html','updateResults'],['bilibili','bilibili-panel.html','testResults'],['popup','test.html','designResults'],['wave','wave.html?test=1','waveResults'],['youtubeWave','youtube-wave.html?test=1','waveResults'],['panelMotion','wave.html?paneltest=1','panelResults'],['reduced','wave.html?edge=reduced','edgeResults'],['missing','wave.html?edge=missing','edgeResults'],['waitingReverse','wave.html?edge=waiting-reverse','edgeResults']];
 const results={};document.getElementById('engine').textContent=navigator.userAgent;
 for(const [name,url,attribute] of cases){
  if(new URLSearchParams(location.search).has('only') && new URLSearchParams(location.search).get('only')!==name)continue;
  const frame=document.createElement('iframe');if(['bilibiliMini','youtubeEngine'].includes(name))frame.style.height='440px';frame.addEventListener('load',()=>frame.scrollIntoView({block:'start'}),{once:true});frame.src=url;document.getElementById('frame').append(frame);
  const deadline=Date.now()+25000;
  while(Date.now()<deadline){await new Promise(r=>setTimeout(r,100));const report=frame.contentDocument?.body?.dataset[attribute];if(report){results[name]=JSON.parse(report);break;}}
  if(!results[name])results[name]=[{name:'test timed out',pass:false}];
  if(name==='popup'&&frame.contentDocument?.body?.dataset.testResults)results.popupCore=JSON.parse(frame.contentDocument.body.dataset.testResults);
  frame.remove();
  document.getElementById('summary').textContent=Object.entries(results).map(([n,r])=>`${r.every(x=>x.pass)?'PASS':'FAIL'} ${n}: ${r.filter(x=>x.pass).length}/${r.length}`).join('\n');
 }
 document.body.dataset.suiteResults=JSON.stringify({engine:navigator.userAgent,results});
 document.getElementById('summary').textContent+='\n完成';
})();
