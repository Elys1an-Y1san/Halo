localStorage.setItem('ambientlight-bilibili-v1',JSON.stringify({enabled:true,blur:60,spread:100,brightness:100}));
// Route gate is bypassed only inside this local test. The production policy is separate.
HaloBilibili.supports = () => true;
const sourceCanvas = document.querySelector('#source');
const sourceContext = sourceCanvas.getContext('2d');
const scene = sourceContext.createLinearGradient(0,0,640,360);
scene.addColorStop(0,'#4f8199');scene.addColorStop(1,'#e7a067');
sourceContext.fillStyle=scene;sourceContext.fillRect(0,0,640,360);
sourceContext.fillStyle='#ffe6b5';sourceContext.beginPath();sourceContext.arc(470,110,34,0,Math.PI*2);sourceContext.fill();
sourceContext.fillStyle='#16232a';sourceContext.beginPath();sourceContext.moveTo(0,300);sourceContext.lineTo(120,200);sourceContext.lineTo(270,290);sourceContext.lineTo(430,170);sourceContext.lineTo(640,300);sourceContext.lineTo(640,360);sourceContext.lineTo(0,360);sourceContext.fill();
document.querySelector('video').srcObject=sourceCanvas.captureStream(1);
