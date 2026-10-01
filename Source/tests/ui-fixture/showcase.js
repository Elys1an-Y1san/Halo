if(new URLSearchParams(location.search).has('showcase')){
const start=document.createElement('button');start.id='demo-start';start.textContent='播放演示';start.style.cssText='position:fixed;left:24px;bottom:24px;padding:10px 20px;border:1px solid #f3c780;background:#141619;color:#f3c780;border-radius:24px;z-index:2147483647';document.body.append(start);
start.onclick=()=>{start.remove();document.querySelector('.lab-tools').hidden=true;const s=document.querySelector('#bili-ambient-ui').shadowRoot,$=id=>s.getElementById(id);setTimeout(()=>$('toggle').click(),500);setTimeout(()=>$('enabled').click(),1100);setTimeout(()=>$('enabled').click(),3900);setTimeout(()=>$('close').click(),5800);setTimeout(()=>document.body.dataset.demoComplete='true',6400);};
}
