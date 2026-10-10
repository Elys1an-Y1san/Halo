// Explicit fixture reset, never included in extension packages.
localStorage.removeItem('halo-youtube-v1');
localStorage.setItem('halo-onboarding-v1',JSON.stringify({pending:true}));
HaloYouTube.supports=url=>url.pathname==='/onboarding.html';
