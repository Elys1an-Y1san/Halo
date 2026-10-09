(async()=>{
 const results=[],sleep=ms=>new Promise(r=>setTimeout(r,ms)),check=(name,pass)=>{results.push({name,pass:!!pass});if(!pass)throw Error(name);};
 try{
 await sleep(400);const root=document.getElementById('controls').shadowRoot,$=id=>root.getElementById(id);
 check('popup selects X from active tab',document.getElementById('site').value==='x');
 check('popup connects to X renderer',$('runtime-status').textContent==='环境光正在生效');
 const other=localStorage.getItem('halo-youtube-v1');$('brightness-number').value='123';$('brightness-number').dispatchEvent(new Event('change'));await sleep(100);
 check('X edits persist in isolated site settings',JSON.parse(localStorage.getItem('halo-x-v1')).brightness===123 && localStorage.getItem('halo-youtube-v1')===other);
 $('compare').click();await sleep(100);check('X comparison connects',$('compare').getAttribute('aria-pressed')==='true');
 }catch(error){results.push({name:error.message,pass:false});}
 document.body.dataset.xPopupResults=JSON.stringify(results);
})();
