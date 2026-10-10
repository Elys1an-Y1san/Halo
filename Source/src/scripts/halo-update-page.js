(() => {
  const api=globalThis.browser || globalThis.chrome,$=id=>document.getElementById(id);
  let context,release,directory,checking=false,recovering=false;
  const send=message=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('timeout')),12000);
    Promise.resolve().then(()=>api.runtime.sendMessage(message)).then(resolve,reject).finally(()=>clearTimeout(timer));
  });
  const guides={
    safari:{name:'Safari',mode:'可通过原生应用下载并安装更新。',steps:['点击「安装更新」，在原生窗口中完成更新。','更新后刷新已打开的视频页。'],note:'原生更新器无法启动时，可下载新版应用，退出旧版后替换应用程序中的映光。'},
    chromium:{name:'Chromium',mode:'当前安装方式需要覆盖文件后重新加载。',steps:['下载并解压新版，将包内 Chrome 文件夹的内容覆盖到原安装文件夹。','打开扩展管理页，找到映光并点击重新加载。','刷新视频页，重新打开面板确认版本。'],location:'chrome://extensions',note:'保留原文件夹路径，不要先移除扩展，以免丢失本地设置。Edge 使用 edge://extensions。'},
    firefox:{name:'Firefox',mode:'当前发行包未签名，需通过临时载入更新。',steps:['下载并解压新版，覆盖原安装文件夹。','打开调试页，找到映光并点击「重新载入」；未加载时选择新版 manifest.json 临时载入。','刷新视频页，重新打开面板确认版本。'],location:'about:debugging#/runtime/this-firefox',note:'未签名的临时扩展会在浏览器重启后卸载。发布签名版本并配置更新源后，才能由浏览器自动安装更新。'},
  };
  const fail=code=>code==='rate_limit'?'查询暂时受限，请稍后在此重试。':code==='invalid_release'?'版本信息校验失败，已停止更新，请稍后重试。':code==='no_release'?'暂无已发布版本。':'查询失败，请检查网络后在此重试。';
  const busy=value=>{checking=value;$('check').disabled=value || recovering;$('install').disabled=value || recovering;$('check').textContent=value?'正在查询…':'检查更新';};
  const check=async()=>{
    if(checking || !context)return;busy(true);release=null;$('download').hidden=true;$('install').hidden=true;$('status').textContent='';
    try {
      const result=await send({type:'halo-check-update',force:true});
      if(!result?.ok){$('status').textContent=fail(result?.code);return;}
      const version=/^\d+\.\d+\.\d+(?:\.\d+)?$/;
      if(!version.test(result.latest) || ![result.latest,'v'+result.latest].some(tag=>result.url===`https://github.com/Elys1an-Y1san/Halo/releases/tag/${tag}`))throw Error('invalid');
      release=result;$('release').href=result.url;
      $('status').textContent=result.available?`新版本 ${result.latest} 可用。`:`当前版本 ${result.current} 无需更新。`;
      if(!result.available)return;
      const names={chromium:`Halo-Chrome-${result.latest}.zip`,firefox:`Halo-Firefox-${result.latest}-unsigned.zip`,safari:`Halo-Safari-${result.latest}.zip`};
      const download=result.assets?.[context.platform];
      if([result.latest,'v'+result.latest].some(tag=>download===`https://github.com/Elys1an-Y1san/Halo/releases/download/${tag}/${names[context.platform]}`)){$('download').href=download;$('download').hidden=context.platform==='chromium';}
      $('install').hidden=!['native','browser','directory'].includes(context.mode);
      $('install').textContent=context.mode==='directory'?'安装更新':context.mode==='browser'?'通过浏览器更新':'安装更新';
      if(context.mode==='manual' && $('download').hidden)$('status').textContent+=' 对应安装包尚未提供，请查看发行记录。';
    } catch {$('status').textContent='无法完成查询，请重新打开更新页后重试。';}
    finally {busy(false);}
  };
  $('check').onclick=check;
  $('install').onclick=async()=>{
    if(checking || recovering || !release?.available)return;
    if(context.mode==='directory'){await localInstall();return;}
    busy(true);$('status').textContent='正在请求更新…';
    try {
      const result=await send({type:context.mode==='native'?'halo-install-update':'halo-browser-update'});
      const messages={ready:'更新已准备好，点击「重启扩展」完成安装。',reloading:'正在重启扩展，请刷新视频页。',throttled:'浏览器暂时限制查询，请稍后在此重试。',no_update:'浏览器更新源尚未提供新版，暂时无法安装。请稍后在此重试。',manual:'此安装方式无法由浏览器更新。',current:'当前无需更新。'};
      $('status').textContent=context.mode==='native' && result?.ok?'原生更新器已启动，请在原生窗口继续。':messages[result?.code] || '更新未能启动，请在此重试。';
      if(result?.code==='ready')$('install').textContent='重启扩展';
    } catch {$('status').textContent='更新未能启动，请在此重试。';}
    finally {busy(false);}
  };
  const localErrors={wrong_directory:'请选择此扩展原来加载的文件夹，里面应有 manifest.json。',missing_digest:'发行包缺少校验信息，已停止安装。',digest_mismatch:'安装包校验失败，未修改现有版本。',invalid_package:'安装包损坏，已停止安装。',unsafe_path:'安装包路径异常，已停止安装。',wrong_package:'安装包与目标版本不符，已停止安装。',new_permissions:'新版申请了不同权限，需要单独审核安装，当前版本未改变。',package_size:'安装包大小异常，已停止安装。',recovery_required:'上次更新中断。请先恢复原文件，再重试。',download_failed:'下载失败，请检查网络后重试。',download_timeout:'下载超时，现有版本未改变，请重试。',update_busy:'另一个更新页正在安装，请等待完成。'};
  const explain=e=>e.name==='AbortError'?'操作已取消，可重新点击安装更新。':e.name==='NotAllowedError'?'未获得文件夹写入权限，请允许后重试。':localErrors[e.message] || '安装未完成，原文件已恢复。请重试。';
  async function localInstall(){
    busy(true);
    try{
      // Permission calls run from this click, before network requests consume activation.
      if(directory){if(await directory.requestPermission({mode:'readwrite'})!=='granted')throw new DOMException('denied','NotAllowedError');}
      else directory=await window.showDirectoryPicker({id:'halo-install-folder',mode:'readwrite'});
      await navigator.locks.request('halo-install-update',{ifAvailable:true},async lock=>{
      if(!lock)throw Error('update_busy');
      $('status').textContent='正在确认安装文件夹…';
      await HaloLocalUpdate.bind(directory,api.runtime.getManifest(),path=>api.runtime.getURL(path));
      const bytes=await HaloLocalUpdate.download(release.assets?.chromium,release.digests?.chromium,n=>{$('status').textContent=`正在下载 ${(n/1024).toFixed(0)} KB…`;});
      $('status').textContent='正在校验安装包…';
      const files=await HaloLocalUpdate.unzip(bytes);HaloLocalUpdate.validate(files,api.runtime.getManifest(),release.latest);
      await HaloLocalUpdate.install(directory,files,(n,total)=>{$('status').textContent=`正在安装 ${n} / ${total}，请保持此页打开…`;});
      $('status').textContent='文件已安装，正在重启扩展并确认版本…';
      const result=await send({type:'halo-complete-local-update',target:release.latest});
      if(!result?.ok)throw Error('reload_failed');
      });
    }catch(e){
      if(e.message==='wrong_directory'){directory=null;await HaloLocalUpdate.state('directory',null);}
      recovering=!!await HaloLocalUpdate.state('journal');$('restore').hidden=!recovering;
      $('status').textContent=e.message==='reload_failed'?'文件已安装，但扩展未重启。请在扩展管理页重新加载后确认版本。':explain(e);
    }finally{busy(false);}
  }
  $('restore').onclick=async()=>{
    busy(true);try{const journal=await HaloLocalUpdate.state('journal');if(journal){if(await journal.dir.requestPermission({mode:'readwrite'})!=='granted')throw new DOMException('denied','NotAllowedError');await HaloLocalUpdate.rollback(journal);}recovering=false;$('restore').hidden=true;$('status').textContent='原文件已恢复，可以重新检查更新。';}catch{$('status').textContent='恢复尚未完成，请保持文件夹可写后重试。';}finally{busy(false);}
  };
  $('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('location').textContent);$('status').textContent='地址已复制，粘贴到浏览器地址栏打开。';}catch{$('status').textContent='复制失败，请选中上方地址后复制。';}};
  document.addEventListener('keydown',()=>document.body.classList.add('keyboard'));
  document.addEventListener('pointerdown',()=>document.body.classList.remove('keyboard'));
  (async()=>{
    try {
      const result=await send({type:'halo-update-context'});
      if(!guides[result?.platform])throw Error('unsupported');context=result;
      if(context.platform==='chromium'){
        $('release').hidden=true;
        const edge=/Edg\//.test(navigator.userAgent);
        guides.chromium={name:edge?'Edge':'Chrome',mode:context.mode==='directory'?'在映光内下载并安装。首次更新需选择原安装文件夹。':'由浏览器的扩展更新源安装。',steps:context.mode==='directory'?['点击检查更新，发现新版后点击安装更新。','首次选择加载扩展时使用的文件夹，并允许写入。','映光会下载、校验并安装，重启后确认新版本。']:['检查更新，然后点击通过浏览器更新。','准备完成后点击重启扩展，刷新视频页。'],note:context.mode==='directory'?'只选择映光扩展文件夹。请保持更新页打开；失败时会恢复原文件。':'浏览器更新源尚未发布新版时会明确提示，可稍后在此重试。'};
        if(context.mode==='directory'){
          directory=await HaloLocalUpdate.state('directory');recovering=!!await HaloLocalUpdate.state('journal');$('restore').hidden=!recovering;$('check').disabled=recovering;
          if(recovering)$('status').textContent=localErrors.recovery_required;
          if(!window.showDirectoryPicker){$('check').disabled=true;$('status').textContent='当前浏览器未提供文件夹更新接口，请升级浏览器后重试。';}
        }
        const receipt=(await api.storage.local.get('halo-update-receipt'))['halo-update-receipt'];
        if(receipt && !recovering)$('status').textContent=receipt.ok && receipt.current===api.runtime.getManifest().version?`已完成更新：${receipt.from} → ${receipt.current}。刷新视频页即可使用。`:'更新后版本不符，请重新检查。';
      }
      const guide=guides[context.platform];$('version').textContent=`${guide.name} · 当前版本 ${api.runtime.getManifest().version}`;
      $('mode').textContent=guide.mode;
      for(const text of guide.steps){const li=document.createElement('li');li.textContent=text;$('steps').append(li);}
      $('note').textContent=guide.note;
      if(guide.location){$('location').hidden=false;$('location').textContent=guide.location;$('copy').hidden=false;}
    } catch {$('version').textContent='无法连接扩展后台，请从映光面板重新打开此页。';$('check').disabled=true;}
  })();
})();
