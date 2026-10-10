(async()=>{
 if(new URLSearchParams(location.search).has('manual'))return;
 const results=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const check=(name,pass)=>{results.push({name,pass:!!pass});if(!pass)throw Error(name);};
 try{
 await sleep(1400);
 const host=document.getElementById('halo-x-ui'),root=host.shadowRoot,$=id=>root.getElementById(id),layer=document.getElementById('halo-x-layer');
 const pixel=()=>layer.querySelector('canvas').getContext('2d').getImageData(1,1,1,1).data;
 check('visible feed video renders',!layer.hidden && pixel()[2]>pixel()[0]);
 check('site theme is preserved',getComputedStyle(document.body).backgroundColor==='rgb(21, 23, 26)' && !document.documentElement.hasAttribute('data-bili-ambient'));
 check('dark theme uses additive glow',layer.style.mixBlendMode==='screen');
 document.body.style.backgroundColor='white';window.dispatchEvent(new Event('resize'));await sleep(100);
 check('light theme keeps glow visible',layer.style.mixBlendMode==='multiply');
 document.body.style.backgroundColor='#15171a';window.dispatchEvent(new Event('resize'));
 check('glow excludes video rectangle',layer.firstElementChild.style.clipPath.includes('evenodd'));
 const before=$('toggle').getBoundingClientRect();
 $('toggle').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',altKey:true,bubbles:true}));await sleep(250);
 check('keyboard moves compact control',$('toggle').getBoundingClientRect().left<before.left-5);
 const saved=JSON.parse(localStorage.getItem('halo-x-v1'));
 check('drag anchor is persisted',Number.isFinite(saved.anchor.x)&&Number.isFinite(saved.anchor.y));
 $('toggle').click();await sleep(250);const panel=$('panel').getBoundingClientRect();
 check('panel stays in viewport after movement',panel.left>=0&&panel.right<=innerWidth&&panel.top>=0&&panel.bottom<=innerHeight);
 $('position').value='left';$('position').dispatchEvent(new Event('change'));await sleep(250);
 check('position selection resets manual anchor',JSON.parse(localStorage.getItem('halo-x-v1')).anchor===null&&host.dataset.side==='left');
 const wrap=document.getElementById('second-wrap');wrap.setAttribute('role','dialog');wrap.style.top='140px';wrap.style.left='440px';await sleep(1000);
 check('media dialog video takes priority',pixel()[0]>pixel()[2]);
 wrap.style.top='1600px';await sleep(1000);check('closing media viewer restores feed video',pixel()[2]>pixel()[0]);
 document.getElementById('first').style.display='none';await sleep(1000);check('no visible video stops rendering and hides control',layer.hidden&&host.hidden);
 document.getElementById('first').style.display='block';await sleep(1000);check('returning visible video resumes rendering',!layer.hidden&&!host.hidden);
 $('enabled').checked=false;$('enabled').dispatchEvent(new Event('change'));await sleep(1250);check('disable clears X glow',layer.hidden&&!document.documentElement.hasAttribute('data-halo-x'));
 }catch(error){results.push({name:error.message,pass:false});}
 document.body.dataset.xResults=JSON.stringify(results);document.getElementById('results').textContent=JSON.stringify(results,null,2);
})();
