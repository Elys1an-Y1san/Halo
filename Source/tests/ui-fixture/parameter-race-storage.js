// Reproduce a delayed storage.onChanged acknowledgement from the same document.
const parameterListeners = [];
chrome.storage.onChanged.addListener = listener => parameterListeners.push(listener);
chrome.storage.local.set = async values => {
  const changes = {};
  for (const [key, value] of Object.entries(values)) {
    localStorage.setItem(key, JSON.stringify(value));
    changes[key] = {newValue: structuredClone(value)};
  }
  await new Promise(resolve => setTimeout(resolve, 180));
  parameterListeners.forEach(listener => listener(changes, 'local'));
};
