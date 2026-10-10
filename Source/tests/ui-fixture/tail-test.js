if(new URLSearchParams(location.search).has('tailtest'))(async()=>{
 const sleep=ms=>new Promise(r=>setTimeout(r,ms)),results=[],frames=[];
 const check=(name,pass)=>{results.push({name,pass:!!pass});};
 const originalStroke=CanvasRenderingContext2D.prototype.stroke,originalClear=CanvasRenderingContext2D.prototype.clearRect;let flare=0,flatBeforeCleanup=false;
 const offBackground=getComputedStyle(document.documentElement).backgroundColor;
 CanvasRenderingContext2D.prototype.clearRect=function(...args){
  if(this.canvas.getRootNode().host?.id==='halo-page-wave' && document.getElementById('halo-page-wave')?.dataset.target==='false'){
   const app=document.documentElement;
   if(app.style.backgroundImage==='none' && app.style.backgroundColor===offBackground)flatBeforeCleanup=true;
  }
  return originalClear.apply(this,args);
 };
 CanvasRenderingContext2D.prototype.stroke=function(...args){if(this.canvas.getRootNode().host?.id==='halo-page-wave'){const alpha=Number(String(this.strokeStyle).match(/,\s*([.\d]+)\)$/)?.[1]||0);flare=Math.max(flare,alpha);}return originalStroke.apply(this,args);};
 window.captureTailFrame=(cost)=>{const wave=document.getElementById('halo-page-wave');if(wave?.dataset.target==='false'){frames.push({radius:Number(wave.dataset.radius),flare,cost,background:document.getElementById('app').style.backgroundImage});}flare=0;};
 try{
 await sleep(650);const root=document.getElementById('bili-ambient-ui').shadowRoot;
 root.getElementById('toggle').click();root.getElementById('enabled').click();await sleep(1200);
 root.getElementById('enabled').click();await sleep(1250);
 const tail=frames.filter(f=>f.radius>0&&f.radius<10);
 check('closing tail captured',tail.length>0);
 check('panel outline glow fades near zero offset',tail.length>0&&tail.every(f=>f.flare<.15));
 check('closing tail reaches original material before cleanup',flatBeforeCleanup);
 check('closing removes wave and renderer',!document.getElementById('halo-page-wave')&&document.getElementById('bili-ambient-layer').hidden);
 check('cleanup restores original page paint',document.getElementById('app').style.backgroundImage==='');
 document.body.dataset.tailFrames=JSON.stringify(frames);
 }catch(e){results.push({name:e.message,pass:false});}
 finally{CanvasRenderingContext2D.prototype.stroke=originalStroke;CanvasRenderingContext2D.prototype.clearRect=originalClear;delete window.captureTailFrame;document.body.dataset.tailResults=JSON.stringify(results);}
})();
