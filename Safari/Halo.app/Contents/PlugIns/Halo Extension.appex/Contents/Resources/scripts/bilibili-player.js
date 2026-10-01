/* Shared, testable Bilibili route and player selection policy. */
globalThis.HaloBilibili = (() => {
  const playerSelector = '.bpx-player-video-wrap, #bilibili-player, #bilibiliPlayer, .bilibili-player-video, .live-player, #live-player, .web-player';
  const supports = (url) => {
    if (url.hostname === 'player.bilibili.com') return /^\/(?:player|blackboard\/html5mobileplayer)\.html$/.test(url.pathname);
    if (url.hostname === 'live.bilibili.com') return /^\/(?:blanc\/)?\d+\/?$/.test(url.pathname);
    if (url.hostname !== 'www.bilibili.com') return false;
    return /^\/(?:video\/|bangumi\/play\/|cheese\/play\/|medialist\/play\/|list\/|festival\/|blackboard\/|watchlater(?:\/|$))/.test(url.pathname);
  };
  const rank = (candidate) => {
    const { rect, viewportWidth, viewportHeight, visible, connected, primary, playing, ready } = candidate;
    if (!visible || !connected || rect.width < 32 || rect.height < 18) return -Infinity;
    const area = rect.width * rect.height;
    const overlap = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(0, rect.left)) *
      Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(0, rect.top));
    // An offscreen player must not beat a visible player, including a floating player.
    return (overlap > 0 ? 1e12 : 0) + (primary ? 1e10 : 0) +
      (playing ? 1e9 : 0) + (ready ? 1e8 : 0) + Math.min(area, 1e7);
  };
  return { supports, rank, playerSelector };
})();
