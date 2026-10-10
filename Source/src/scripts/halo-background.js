/* Chrome service worker or Safari background page. */
if (!globalThis.HaloUpdates && typeof importScripts === 'function') globalThis.importScripts('halo-update.js');
const haloAPI=globalThis.browser || globalThis.chrome;
const haloUpdateService=HaloUpdates.create({storage:haloAPI.storage.local});
let haloUpdateReady=false;
haloAPI.runtime.onUpdateAvailable?.addListener(()=>{haloUpdateReady=true;});
const haloUpdateContext=async()=>{
  const manifest=haloAPI.runtime.getManifest();
  if(manifest.permissions?.includes('nativeMessaging'))return {platform:'safari',mode:'native'};
  if(manifest.browser_specific_settings?.gecko)return {platform:'firefox',mode:'manual'};
  let installType='unknown';
  try {installType=(await haloAPI.management?.getSelf())?.installType || 'unknown';} catch { /* Unpacked installs use the guided path. */ }
  return {platform:'chromium',mode:installType==='development'?'directory':haloAPI.runtime.requestUpdateCheck?'browser':'manual',ready:haloUpdateReady};
};
let haloGuideQueue=Promise.resolve();
haloAPI.runtime.onInstalled?.addListener(details=>{
  if(details.reason==='update'){
    (async()=>{const pending=(await haloAPI.storage.local.get('halo-update-pending'))['halo-update-pending'];if(!pending)return;
      const current=haloAPI.runtime.getManifest().version;
      await haloAPI.storage.local.set({'halo-update-receipt':{...pending,current,ok:current===pending.target},'halo-update-pending':null});
      await haloAPI.tabs.create({url:haloAPI.runtime.getURL('update.html')});
    })().catch(()=>{});
  }
  if(details.reason!=='install')return;
  haloGuideQueue=haloGuideQueue.catch(()=>{}).then(async()=>{
    const key='halo-onboarding-v1';
    if(!(await haloAPI.storage.local.get(key))[key])await haloAPI.storage.local.set({[key]:{pending:true}});
  }).catch(()=>{});
});
haloAPI.runtime.onMessage.addListener((message,sender,reply)=>{
  if (sender.id && sender.id !== haloAPI.runtime.id) return false;
  if(message?.type==='halo-guide-claim'){
    haloGuideQueue=haloGuideQueue.catch(()=>{}).then(async()=>{
      const key='halo-onboarding-v1',state=(await haloAPI.storage.local.get(key))[key];
      if(!state?.pending)return {ok:false};
      await haloAPI.storage.local.set({[key]:{seenAt:Date.now()}});
      return {ok:true};
    });
    haloGuideQueue.then(reply,()=>reply({ok:false}));return true;
  }
  if(message?.type==='halo-open-onboarding'){
    (async()=>{
      const tab=sender.tab || (await haloAPI.tabs.query({active:true,currentWindow:true}))[0];
      if(!tab?.id)return {ok:false};
      return haloAPI.tabs.sendMessage(tab.id,{type:'halo-start-guide'}, {frameId:sender.frameId || 0});
    })().then(reply,()=>reply({ok:false}));return true;
  }
  if(message?.type==='halo-open-updates'){
    haloAPI.tabs.create({url:haloAPI.runtime.getURL('update.html')}).then(()=>reply({ok:true}),()=>reply({ok:false}));return true;
  }
  if(message?.type==='halo-update-context'){
    haloUpdateContext().then(reply,()=>reply({platform:'chromium',mode:'manual'}));return true;
  }
  if(message?.type==='halo-complete-local-update'){
    if(sender.url!==haloAPI.runtime.getURL('update.html'))return false;
    (async()=>{const context=await haloUpdateContext();if(context.mode!=='directory' || !/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(message.target))return {ok:false};
      await haloAPI.storage.local.set({'halo-update-pending':{from:haloAPI.runtime.getManifest().version,target:message.target}});
      setTimeout(()=>haloAPI.runtime.reload(),250);return {ok:true};
    })().then(reply,()=>reply({ok:false}));return true;
  }
  if(message?.type==='halo-browser-update'){
    (async()=>{
      const context=await haloUpdateContext();
      if(context.mode!=='browser')return {ok:false,code:'manual'};
      if(haloUpdateReady){haloAPI.runtime.reload();return {ok:true,code:'reloading'};}
      const result=await haloAPI.runtime.requestUpdateCheck();
      if(result.status==='update_available'){haloUpdateReady=true;return {ok:true,code:'ready'};}
      return {ok:false,code:result.status==='throttled'?'throttled':'no_update'};
    })().then(reply,()=>reply({ok:false,code:'manual'}));return true;
  }
  const native = haloAPI.runtime.getManifest().permissions?.includes('nativeMessaging');
  if(message?.type === 'halo-native-update-info' || message?.type === 'halo-install-update'){
    if(!native){reply({ok:false,supported:false});return false;}
    const type=message.type==='halo-install-update'?'halo-install-update':'halo-update-info';
    (async()=>{
      if(type==='halo-install-update'){
        const release=await haloUpdateService.check(haloAPI.runtime.getManifest().version,true);
        if(!release.ok || !release.available)return {ok:false,code:release.ok?'current':release.code};
      }
      return haloAPI.runtime.sendNativeMessage('local.ambientlight.safari',{type});
    })().then(reply,()=>reply({ok:false,supported:false,code:'native_failed'}));
    return true;
  }
  if(message?.type !== 'halo-check-update')return false;
  haloUpdateService.check(haloAPI.runtime.getManifest().version,message.force===true).then(reply,()=>reply({ok:false,code:'network'}));
  return true;
});
