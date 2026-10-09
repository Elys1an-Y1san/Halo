/* Halo's video geometry is independent of site markup and rendering APIs. */
globalThis.HaloVideo = {
  geometry(rect, videoWidth, videoHeight, settings) {
    if (![rect.width, rect.height, videoWidth, videoHeight].every(n => Number.isFinite(n) && n > 0)) return null;
    const ratio = videoWidth / videoHeight;
    const width = Math.min(rect.width, rect.height * ratio), height = width / ratio;
    const grow = Math.max(width, height) * settings.spread / 100;
    return {
      height: Math.max(1, Math.min(1280, Math.round(320 / ratio))),
      style: {
        width: `${width + grow}px`, height: `${height + grow}px`,
        left: `${rect.left + (rect.width - width - grow) / 2}px`,
        top: `${rect.top + (rect.height - height - grow) / 2}px`,
        filter: `blur(${height * .0025 * settings.blur}px) brightness(${settings.brightness}%)`,
      },
    };
  },
};
