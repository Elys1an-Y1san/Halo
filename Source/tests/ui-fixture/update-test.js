(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms)),results=[];const check=(name,pass)=>{results.push({name,pass:!!pass});if(!pass)throw Error(name);};const nativeFetch=window.fetch;
try{await wait(300);const s=document.getElementById('controls').shadowRoot,$=id=>s.getElementById(id),button=$('check-update'),p=$('panel'),size=[p.clientWidth,p.clientHeight];
let calls=0;window.fetch=async()=>{calls++;await wait(120);return{ok:true,json:async()=>({tag_name:'v1.0.10',html_url:'https://github.com/Elys1an-Y1san/Halo/releases/tag/v1.0.10'})}};
button.click();check('lookup exposes busy state',button.disabled&&button.textContent.includes('查询'));button.click();await wait(200);
check('lookup compares numeric versions',$('update-status').textContent==='新版本 1.0.10 可用');check('lookup exposes validated release link',!$('release-link').hidden&&$('release-link').href==='https://github.com/Elys1an-Y1san/Halo/releases/tag/v1.0.10');check('busy button deduplicates request',calls===1);check('lookup preserves panel space',p.clientWidth===size[0]&&p.clientHeight===size[1]);
window.fetch=async()=>({ok:true,json:async()=>({tag_name:'v1.0.3',html_url:'https://github.com/Elys1an-Y1san/Halo/releases/tag/v1.0.3'})});button.click();await wait(30);check('current version reports accurately',$('update-status').textContent==='已是最新版本 1.0.3'&&$('release-link').hidden);
window.fetch=async()=>({ok:false,status:429});button.click();await wait(30);check('rate limit gives retry guidance',$('update-status').textContent.includes('频繁')&&!button.disabled);
window.fetch=async()=>{throw Error('offline')};button.click();await wait(30);check('offline recovers controls',$('update-status').textContent.includes('重试')&&!button.disabled&&$('release-link').hidden);
window.fetch=async()=>({ok:true,json:async()=>({tag_name:'v1.0.11',html_url:'https://evil.example/'})});button.click();await wait(30);check('untrusted release cannot create link',$('release-link').hidden&&$('update-status').textContent.includes('失败'));
}catch(e){results.push({name:e.message,pass:false});}finally{window.fetch=nativeFetch;document.body.dataset.updateResults=JSON.stringify(results);}
})();
