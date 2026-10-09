// Opt-in manual integration page: uses the real public endpoint, not release mocks.
const fixtureVersion = new URLSearchParams(location.search).get('version') || '1.1.2';
if (!/^\d+\.\d+\.\d+$/.test(fixtureVersion)) throw Error('Invalid fixture version');
chrome.runtime.getManifest = () => ({version: fixtureVersion});
