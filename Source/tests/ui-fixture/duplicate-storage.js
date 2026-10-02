const originalGet = chrome.storage.local.get;
chrome.storage.local.get = async key => { await new Promise(r => setTimeout(r, 250)); return originalGet(key); };
