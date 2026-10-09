/* X uses multiple recycled video elements in its feed and media viewer. */
globalThis.HaloX = {
  supports: url => ['x.com','www.x.com','twitter.com','www.twitter.com'].includes(url.hostname) && !/^\/(?:i\/flow|i\/jf|login|signup|settings)(?:\/|$)/.test(url.pathname),
  playerSelector: '[data-testid="videoPlayer"], [data-testid="videoComponent"], [role="dialog"]',
  rank({rect,viewportWidth,viewportHeight,visible,connected,playing,ready,modal}) {
    if(!visible || !connected || rect.width<48 || rect.height<48)return -Infinity;
    const overlap=Math.max(0,Math.min(rect.right,viewportWidth)-Math.max(0,rect.left))*Math.max(0,Math.min(rect.bottom,viewportHeight)-Math.max(0,rect.top));
    if(overlap<=0)return -Infinity;
    const fraction=overlap/(rect.width*rect.height);
    return (modal?1e12:0)+(playing && fraction>.15 ? 1e9 : 0)+(ready?1e7:0)+fraction*1e6+Math.min(overlap,1e6);
  },
};
