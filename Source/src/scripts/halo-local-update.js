/* Unpacked installs only. Writes a verified release to a user-selected directory;
   never evaluates downloaded scripts in the running extension. */
(() => {
  'use strict';
  const MAX=24*1024*1024,decoder=new TextDecoder(),encoder=new TextEncoder();
  const fail=code=>{throw Error(code);};
  const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
  const crc32=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
  async function unzip(buffer) {
    if(buffer.byteLength>MAX)fail('package_size');
    const v=new DataView(buffer),bytes=new Uint8Array(buffer),files=new Map();
    let end=-1;
    for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(v.getUint32(i,true)===0x06054b50 && i+22+v.getUint16(i+20,true)===bytes.length){end=i;break;}
    if(end<0 || v.getUint16(end+4,true) || v.getUint16(end+6,true))fail('invalid_package');
    const count=v.getUint16(end+10,true),offset=v.getUint32(end+16,true);
    if(count>256 || count!==v.getUint16(end+8,true) || offset+v.getUint32(end+12,true)!==end)fail('invalid_package');
    let p=offset,total=0;
    for(let i=0;i<count;i++){
      if(p+46>end || v.getUint32(p,true)!==0x02014b50)fail('invalid_package');
      const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),crc=v.getUint32(p+16,true),size=v.getUint32(p+20,true),expanded=v.getUint32(p+24,true),n=v.getUint16(p+28,true),extra=v.getUint16(p+30,true),comment=v.getUint16(p+32,true),local=v.getUint32(p+42,true);
      const name=decoder.decode(bytes.slice(p+46,p+46+n));
      if(p+46+n+extra+comment>end || (flags&1) || ![0,8].includes(method) || ((v.getUint32(p+38,true)>>>16)&0xf000)===0xa000)fail('invalid_package');
      p+=46+n+extra+comment;
      if(!/^Chrome\/(?:[a-zA-Z0-9_-]+\/)*(?:[a-zA-Z0-9_.-]+)?$/.test(name) || name.includes('..'))fail('unsafe_path');
      if(name.endsWith('/'))continue;
      const path=name.slice(7);
      if(files.has(path) || !path || (total+=expanded)>MAX)fail('invalid_package');
      if(local+30>offset || v.getUint32(local,true)!==0x04034b50)fail('invalid_package');
      const ln=v.getUint16(local+26,true),le=v.getUint16(local+28,true),start=local+30+ln+le;
      if(start+size>offset || decoder.decode(bytes.slice(local+30,local+30+ln))!==name || v.getUint16(local+8,true)!==method)fail('invalid_package');
      let data=bytes.slice(start,start+size);
      if(method===8){
        const reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),chunks=[];let length=0;
        try{while(true){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>expanded)fail('package_size');chunks.push(part.value);}}finally{await reader.cancel();}
        data=new Uint8Array(length);let at=0;for(const chunk of chunks){data.set(chunk,at);at+=chunk.length;}
      }
      if(data.length!==expanded || crc32(data)!==crc)fail('invalid_package');
      files.set(path,data);
    }
    if(p!==end || !files.has('manifest.json'))fail('invalid_package');
    return files;
  }
  function validate(files,current,target){
    const manifest=JSON.parse(decoder.decode(files.get('manifest.json')));
    if(manifest.name!==current.name || manifest.version!==target || manifest.manifest_version!==3 || manifest.background?.service_worker!=='scripts/background.js')fail('wrong_package');
    // New powers require a separate reviewed installation, never a silent file update.
    for(const key of ['permissions','host_permissions','optional_permissions','optional_host_permissions'])if((manifest[key]||[]).some(value=>!(current[key]||[]).includes(value)))fail('new_permissions');
    for(const key of ['key','externally_connectable','oauth2','update_url'])if(JSON.stringify(manifest[key])!==JSON.stringify(current[key]))fail('new_permissions');
    if((manifest.content_scripts||[]).some(entry=>entry.world==='MAIN' || entry.matches.some(value=>!(current.content_scripts||[]).some(old=>old.matches.includes(value)))))fail('new_permissions');
    const refs=[manifest.background.service_worker,manifest.action?.default_popup,manifest.options_ui?.page,...Object.values(manifest.icons||{}),...(manifest.content_scripts||[]).flatMap(e=>[...(e.js||[]),...(e.css||[])])].filter(Boolean);
    if(refs.some(path=>!files.has(path)))fail('invalid_package');
    return manifest;
  }
  async function fileAt(dir,path,create=false){
    const parts=path.split('/');let parent=dir;
    for(const part of parts.slice(0,-1))parent=await parent.getDirectoryHandle(part,{create});
    return {parent,name:parts.at(-1)};
  }
  async function read(dir,path){try{const {parent,name}=await fileAt(dir,path);return new Uint8Array(await (await (await parent.getFileHandle(name)).getFile()).arrayBuffer());}catch(e){if(e.name==='NotFoundError')return null;throw e;}}
  async function write(dir,path,bytes){const {parent,name}=await fileAt(dir,path,true),file=await parent.getFileHandle(name,{create:true}),writer=await file.createWritable();try{await writer.write(bytes);await writer.close();}catch(e){await writer.abort().catch(()=>{});throw e;}}
  async function remove(dir,path){try{const {parent,name}=await fileAt(dir,path);await parent.removeEntry(name);}catch(e){if(e.name!=='NotFoundError')throw e;}}
  const database=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('halo-local-update',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  async function state(key,value){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('state',value===undefined?'readonly':'readwrite'),store=tx.objectStore('state'),req=value===undefined?store.get(key):value===null?store.delete(key):store.put(value,key);tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
  async function rollback(journal){for(const [path,bytes] of journal.backup){if(bytes===null)await remove(journal.dir,path);else await write(journal.dir,path,bytes);}await state('journal',null);}
  async function bind(dir,current,getURL){
    const data=await read(dir,'manifest.json');if(!data)fail('wrong_directory');
    const m=JSON.parse(decoder.decode(data));if(m.name!==current.name || m.version!==current.version)fail('wrong_directory');
    // Verify this exact loaded path, not another copy with the same manifest.
    const path='halo-update-probe.txt',old=await read(dir,path),token=crypto.randomUUID();
    try{await write(dir,path,encoder.encode(token));const r=await fetch(getURL(path)+'?probe='+token,{cache:'no-store'});if(!r.ok || await r.text()!==token)fail('wrong_directory');}
    finally{if(old)await write(dir,path,old);else await remove(dir,path);}
    await state('directory',dir);
  }
  async function install(dir,files,progress){
    if(await state('journal'))fail('recovery_required');
    const ordered=[...files].filter(([p])=>p!=='manifest.json');ordered.push(['manifest.json',files.get('manifest.json')]);
    const backup=[];for(const [path] of ordered)backup.push([path,await read(dir,path)]);
    const journal={dir,backup};await state('journal',journal);
    try{let n=0;for(const [path,bytes] of ordered){await write(dir,path,bytes);if(await digest(await read(dir,path))!==await digest(bytes))fail('write_failed');progress(++n,ordered.length);}await state('journal',null);}
    catch(error){try{await rollback(journal);}catch{fail('recovery_required');}throw error;}
  }
  async function download(url,expected,progress){
    if(!/^https:\/\/github\.com\/Elys1an-Y1san\/Halo\/releases\/download\/v?\d+\.\d+\.\d+(?:\.\d+)?\/Halo-Chrome-\d+\.\d+\.\d+(?:\.\d+)?\.zip$/.test(url) || !/^[a-f0-9]{64}$/.test(expected||''))fail('missing_digest');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
    try{
      const r=await fetch(url,{credentials:'omit',cache:'no-store',signal:controller.signal});
      if(!r.ok || !['https://github.com','https://release-assets.githubusercontent.com'].includes(new URL(r.url).origin))fail('download_failed');
      const reader=r.body.getReader(),chunks=[];let size=0;
      while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>MAX){await reader.cancel();fail('package_size');}chunks.push(part.value);progress(size);}
      const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}
      if(await digest(bytes)!==expected)fail('digest_mismatch');return bytes.buffer;
    }catch(error){if(controller.signal.aborted)fail('download_timeout');throw error;}finally{clearTimeout(timer);}
  }
  globalThis.HaloLocalUpdate={unzip,validate,bind,install,download,state,rollback};
})();
