/* Site discovery only; no page-script injection, player internals or network calls. */
globalThis.HaloYouTube = {
  supports: url => url.hostname === 'www.youtube.com' &&
    ((url.pathname === '/watch' && !!url.searchParams.get('v')) || /^\/(?:embed|shorts|live)\/[^/]+/.test(url.pathname)),
  playerSelector: '#movie_player, #shorts-player, .html5-video-player',
  modeSelector: '#movie_player, ytd-miniplayer',
  modeAttributes: ['class', 'active'],
  isMini: video => !!video?.closest('.ytp-player-minimized, ytd-miniplayer[active]'),
  rank({rect, viewportWidth, viewportHeight, visible, connected, primary, playing, ready, mini}) {
    if (mini || !connected || !visible || rect.width < 32 || rect.height < 18) return -Infinity;
    const overlap = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(0, rect.left)) *
      Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(0, rect.top));
    return (overlap > 0 ? 1e12 : 0) + (primary ? 1e10 : 0) + (playing ? 1e9 : 0) +
      (ready ? 1e8 : 0) + Math.min(overlap, 1e7);
  },
};
