HaloX.supports=()=>true;
if(!new URLSearchParams(location.search).has('persist'))localStorage.setItem('halo-x-v1',JSON.stringify({enabled:true,blur:60,spread:50,brightness:100}));
for(const [id,color] of [['first','#3f71bd'],['second','#d98643']]){
 const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,320,180);
 document.getElementById(id).srcObject=canvas.captureStream(30);
 setInterval(()=>{ctx.fillStyle=color;ctx.fillRect(0,0,320,180);},33);
}
