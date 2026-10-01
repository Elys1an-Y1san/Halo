/* Public release metadata only. No account, token, browsing URL or remote code. */
(() => {
  'use strict';
  const repository = 'Elys1an-Y1san/Halo';
  const releasesURL = `https://github.com/${repository}/releases`;
  const endpoint = `https://api.github.com/repos/${repository}/releases/latest`;
  const parseVersion = value => {
    const match = /^v?(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$/.exec(String(value));
    return match ? match.slice(1).map(part => Number(part || 0)) : null;
  };
  const compareVersions = (a, b) => {
    const left = parseVersion(a), right = parseVersion(b);
    if (!left || !right) throw new Error('invalid_release');
    for (let i=0;i<4;i++) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
    return 0;
  };
  const validateRelease = value => {
    if (!value || value.draft || value.prerelease || !parseVersion(value.tag_name)) throw new Error('invalid_release');
    const url = new URL(value.html_url);
    if (url.origin !== 'https://github.com' || !url.pathname.startsWith(`/${repository}/releases/tag/`)) throw new Error('invalid_release');
    return {version:value.tag_name.replace(/^v/,''),url:url.href};
  };
  globalThis.HaloUpdates = {
    repository, releasesURL, endpoint, compareVersions,
    create({ storage, fetcher = (...args) => fetch(...args), now = () => Date.now(), timeoutMS = 8000 }) {
      let pending;
      const key='halo-release-cache-v1', ttl=6*60*60*1000;
      const result=(release,current,checkedAt,cached) => ({ok:true,current,latest:release.version,available:compareVersions(release.version,current)>0,url:release.url,checkedAt,cached});
      return {
        check(current, force=false) {
          if (pending) return pending;
          pending=(async()=>{
            if (!parseVersion(current)) return {ok:false,code:'invalid_release',url:releasesURL};
            if (!force) {
              try {
                const cache=(await storage.get(key))[key];
                if (cache && now()-cache.checkedAt>=0 && now()-cache.checkedAt<ttl) {
                  const release=validateRelease({tag_name:cache.version,html_url:cache.url});
                  return result(release,current,cache.checkedAt,true);
                }
              } catch { /* A damaged cache must not block a fresh query. */ }
            }
            const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMS);
            try {
              const response=await fetcher(endpoint,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},credentials:'omit',redirect:'error',signal:controller.signal});
              if (!response.ok) throw new Error(response.status===404?'no_release':response.status===403||response.status===429?'rate_limit':'network');
              const release=validateRelease(await response.json()),checkedAt=now();
              try { await storage.set({[key]:{...release,checkedAt}}); } catch { /* Successful network result remains usable without caching. */ }
              return result(release,current,checkedAt,false);
            } catch(error) {
              const code=['no_release','rate_limit','invalid_release'].includes(error.message)?error.message:'network';
              return {ok:false,code,url:releasesURL};
            } finally { clearTimeout(timer); }
          })().finally(()=>{pending=null;});
          return pending;
        },
      };
    },
  };
})();
