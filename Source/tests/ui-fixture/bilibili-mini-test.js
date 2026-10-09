(async () => {
  const results = [];
  const check = (name, ok) => { results.push({name, pass:!!ok}); if (!ok) throw Error(name); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const until = async test => { for(let i=0;i<100;i++){if(test())return;await wait(30);}throw Error('Timed out'); };
  const player = document.querySelector('.bpx-player-container');
  const video = player.querySelector('video');
  const light = () => !document.getElementById('bili-ambient-layer')?.hidden;
  const mode = value => { player.dataset.screen=value; player.style.cssText=value==='mini'?'position:fixed;right:20px;bottom:20px;width:320px':'width:100%'; };
  let paints=0, miniPaints=0, writes=0;
  const originalDraw=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage=function(...args){
    if(this.canvas.parentElement?.id==='bili-ambient-layer'){paints++;if(player.dataset.screen==='mini')miniPaints++;}
    return originalDraw.apply(this,args);
  };
  const originalSet=chrome.storage.local.set;
  chrome.storage.local.set=async (...args)=>{writes++;return originalSet(...args);};
  try {
    await until(light);
    check('主播放器启用环境光',light());
    mode('mini'); await new Promise(requestAnimationFrame);
    check('切换后的首个绘制帧已隐藏环境光',!light()&&!document.documentElement.hasAttribute('data-bili-ambient'));
    const stopped=paints; await wait(900);
    check('小窗期间停止采样',paints===stopped && miniPaints===0);
    mode('normal');await until(light);
    check('返回主播放器恢复采样',paints>stopped);
    await video.pause(); mode('mini');await wait(50);mode('normal');await until(light);
    check('暂停的视频返回主播放器也恢复光效',light());
    for(let i=0;i<8;i++){mode('mini');await new Promise(requestAnimationFrame);check(`快速切换 ${i+1} 不残留光效`,!light());mode('normal');await until(light);}
    check('滚动模式变化没有写入开关偏好',writes===0 && JSON.parse(localStorage.getItem('ambientlight-bilibili-v1')).enabled===true);
    player.style.width='320px';await wait(100);
    check('正常模式的窄播放器仍可使用环境光',light());
    const shadow=document.getElementById('bili-ambient-ui').shadowRoot;
    shadow.getElementById('enabled').click();await wait(80);mode('mini');await new Promise(requestAnimationFrame);
    check('关闭动画期间切入小窗不残留波纹',!light()&&!document.documentElement.hasAttribute('data-halo-wave'));
    mode('normal');await wait(800);
    check('用户关闭后返回主播放器保持关闭',!light());
    shadow.getElementById('enabled').click();await wait(80);mode('mini');await new Promise(requestAnimationFrame);
    check('开启动画期间切入小窗不残留波纹',!light()&&!document.documentElement.hasAttribute('data-halo-wave'));
    mode('normal');await until(light);
    check('小窗中止开启动画后主播放器可恢复',light() && miniPaints===0);
  } catch(error) { results.push({name:error.message,pass:false}); }
  finally { CanvasRenderingContext2D.prototype.drawImage=originalDraw;chrome.storage.local.set=originalSet; }
  document.body.dataset.miniResults=JSON.stringify(results);
  const output=document.createElement('pre');output.textContent=results.map(r=>`${r.pass?'PASS':'FAIL'} ${r.name}`).join('\n');document.body.append(output);
})();
