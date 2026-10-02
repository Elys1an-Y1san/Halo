(async()=>{
 const cases=[['duplicate','duplicate-init.html','duplicateResults'],['parameters','parameter-race.html','parameterResults'],['updates','update-test.html','updateResults'],['bilibili','bilibili-panel.html','testResults'],['popup','test.html','designResults']];
 const results={};document.getElementById('engine').textContent=navigator.userAgent;
 for(const [name,url,attribute] of cases){
  const frame=document.createElement('iframe');document.getElementById('frame').append(frame);frame.src=url;
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
