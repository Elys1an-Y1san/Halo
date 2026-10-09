/* Chrome service worker or Safari background page. */
if (!globalThis.HaloUpdates && typeof importScripts === 'function') globalThis.importScripts('halo-update.js');
const haloAPI=globalThis.browser || globalThis.chrome;
const haloUpdateService=HaloUpdates.create({storage:haloAPI.storage.local});
haloAPI.runtime.onMessage.addListener((message,sender,reply)=>{
  if (sender.id && sender.id !== haloAPI.runtime.id) return false;
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
