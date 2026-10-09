chrome.tabs.query=async()=>[{id:2,url:'https://x.com/person/status/123'}];
chrome.tabs.sendMessage=async(id,message)=>message.type==='halo-status'?{status:'环境光正在生效'}:{ok:true};
