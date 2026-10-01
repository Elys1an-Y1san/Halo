/* Chrome service worker or Safari background page. */
if (!globalThis.HaloUpdates && typeof importScripts === 'function') globalThis.importScripts('halo-update.js');
const haloAPI=globalThis.browser || globalThis.chrome;
const haloUpdateService=HaloUpdates.create({storage:haloAPI.storage.local});
haloAPI.runtime.onInstalled.addListener(() => { haloAPI.storage.local.set({crashOptions:{crash:false,technical:false,video:false}}); });
haloAPI.runtime.onMessage.addListener((message,sender,reply)=>{
  if (message?.type !== 'halo-check-update') return false;
  if (sender.id && sender.id !== haloAPI.runtime.id) return false;
  haloUpdateService.check(haloAPI.runtime.getManifest().version, message.force === true).then(reply,()=>reply({ok:false,code:'network'}));
  return true;
});
