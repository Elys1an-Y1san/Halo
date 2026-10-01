if (globalThis.HaloBilibili) HaloBilibili.supports=()=>true;
const sourceCanvas=document.getElementById('source'),sourceContext=sourceCanvas.getContext('2d');
const drawScene=now=>{
 const shift=(Math.sin(now/2600)+1)/2;
 const scene=sourceContext.createLinearGradient(0,0,640,360);
 scene.addColorStop(0,`rgb(${55+shift*34},${102+shift*42},${143+shift*30})`);scene.addColorStop(1,`rgb(${220-shift*40},${140+shift*28},${80+shift*45})`);
 sourceContext.fillStyle=scene;sourceContext.fillRect(0,0,640,360);
 sourceContext.fillStyle='#ffe6b5';sourceContext.beginPath();sourceContext.arc(470+Math.sin(now/1400)*10,105,32,0,Math.PI*2);sourceContext.fill();
 sourceContext.fillStyle='#16232a';sourceContext.beginPath();sourceContext.moveTo(0,300);sourceContext.lineTo(120,200);sourceContext.lineTo(270,290);sourceContext.lineTo(430,170);sourceContext.lineTo(640,300);sourceContext.lineTo(640,360);sourceContext.lineTo(0,360);sourceContext.fill();
 document.body.dataset.sourceFrame=String(now);
 requestAnimationFrame(drawScene);
};
requestAnimationFrame(drawScene);
if(!['missing','waiting-reverse'].includes(new URLSearchParams(location.search).get('edge')))document.querySelector('video').srcObject=sourceCanvas.captureStream(30);
const control=(enabled)=>{const s=document.querySelector('#bili-ambient-ui,#halo-youtube-ui')?.shadowRoot;if(!s)return;s.getElementById('toggle').getAttribute('aria-expanded')==='false'&&s.getElementById('toggle').click();if(s.getElementById('enabled').checked!==enabled)s.getElementById('enabled').click();};
document.getElementById('lab-enable').onclick=()=>control(true);document.getElementById('lab-disable').onclick=()=>control(false);
if(new URLSearchParams(location.search).has('auto'))setTimeout(()=>control(true),700);
