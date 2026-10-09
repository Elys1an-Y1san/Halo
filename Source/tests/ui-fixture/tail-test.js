if(new URLSearchParams(location.search).has('tailtest'))(async()=>{
 const sleep=ms=>new Promise(r=>setTimeout(r,ms)),results=[],frames=[];
 const check=(name,pass)=>{results.push({name,pass:!!pass});};
 const originalDraw=CanvasRenderingContext2D.prototype.drawImage,originalClear=CanvasRenderingContext2D.prototype.clearRect;let flare=0,flatBeforeCleanup=false;
 const offBackground=getComputedStyle(document.getElementById('app')).backgroundColor;
 CanvasRenderingContext2D.prototype.clearRect=function(...args){
  if(this.canvas.getRootNode().host?.id==='halo-page-wave' && document.getElementById('halo-page-wave')?.dataset.target==='false'){
   const app=document.getElementById('app');
   if(app.style.backgroundImage==='none' && app.style.backgroundColor===offBackground)flatBeforeCleanup=true;
  }
  return originalClear.apply(this,args);
 };
 CanvasRenderingContext2D.prototype.drawImage=function(source,...args){if(source.width===192&&source.height===192)flare=this.globalAlpha;return originalDraw.call(this,source,...args);};
 window.captureTailFrame=(cost)=>{const wave=document.getElementById('halo-page-wave');if(wave?.dataset.target==='false'){frames.push({radius:Number(wave.dataset.radius),flare,cost,background:document.getElementById('app').style.backgroundImage});}flare=0;};
 try{
 await sleep(650);const root=document.getElementById('bili-ambient-ui').shadowRoot;
 root.getElementById('toggle').click();root.getElementById('enabled').click();await sleep(1200);
 root.getElementById('enabled').click();await sleep(900);
 const tail=frames.filter(f=>f.radius>0&&f.radius<10);
 check('closing tail captured',tail.length>0);
 check('launch flare fades near zero radius',tail.length>0&&tail.every(f=>f.flare<.15));
 check('closing tail reaches original material before cleanup',flatBeforeCleanup);
 check('closing removes wave and renderer',!document.getElementById('halo-page-wave')&&document.getElementById('bili-ambient-layer').hidden);
 check('cleanup restores original page paint',document.getElementById('app').style.backgroundImage==='');
 document.body.dataset.tailFrames=JSON.stringify(frames);
 }catch(e){results.push({name:e.message,pass:false});}
 finally{CanvasRenderingContext2D.prototype.drawImage=originalDraw;CanvasRenderingContext2D.prototype.clearRect=originalClear;delete window.captureTailFrame;document.body.dataset.tailResults=JSON.stringify(results);}
})();
