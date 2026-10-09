/* Shared frame processing, adaptive sampling and site-independent geometry. */
globalThis.HaloVideo = {
  // Time-based blending is independent of the selected sampling rate.
  blend(elapsed) { return 1 - Math.exp(-Math.max(0, Math.min(250, elapsed)) / 110); },
  exposure(pixels, brightness) {
    let luminance = 0;
    const peaks = [];
    for (let i = 0; i < pixels.length; i += 4) {
      luminance += (.2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2]) / 255;
      peaks.push(Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) / 255);
    }
    if (!peaks.length) return 1;
    const mean = luminance / peaks.length;
    // A percentile prevents a few subtitle pixels from dimming the entire glow.
    peaks.sort((a, b) => a - b);
    const peak = peaks[Math.floor((peaks.length - 1) * .9)];
    const dark = Math.min(1, mean / .12);
    return dark * dark * (3 - 2 * dark) * Math.min(1, .85 / Math.max(.01, peak * brightness / 100));
  },
  createAdaptiveQuality() {
    let fps = 30, pressureSince = null, healthySince = null, last = null, meanCost = 0, meanLag = 0;
    return {
      get fps() { return fps; },
      reset() { fps = 30; pressureSince = healthySince = last = null; },
      observe(now, cost, lag) {
        // Idle/hidden time is not evidence of either load or recovery.
        if (last === null || now - last > 500 || now < last) {
          pressureSince = healthySince = null; meanCost = cost; meanLag = lag;
        } else {
          // Isolated expensive frames must not strand a healthy session at 15 fps.
          const weight = 1 - Math.exp(-(now - last) / 500);
          meanCost += (cost - meanCost) * weight;
          meanLag += (lag - meanLag) * weight;
        }
        last = now;
        if (meanCost > 6 || meanLag > 20) {
          healthySince = null;
          pressureSince ??= now;
          if (now - pressureSince >= 1000) { fps = 15; pressureSince = null; }
        } else {
          pressureSince = null;
          if (meanCost < 3 && meanLag < 8) {
            healthySince ??= now;
            if (now - healthySince >= 12000) { fps = 30; healthySince = null; }
          } else healthySince = null;
        }
        return fps;
      },
    };
  },
  createLightProcessor() {
    const probe = document.createElement('canvas');
    probe.width = 16; probe.height = 9;
    let probeContext, readable = true, lastProbe = -Infinity, lastFrame = null, gain = 1, target = 1, lastBrightness = null;
    try { probeContext = probe.getContext('2d', { willReadFrequently: true }); } catch { /* Drawing can still work without readback. */ }
    return {
      get limited() { return !probeContext || !readable; },
      reset() {
        // Resizing also clears the origin-tainted flag when switching media.
        probe.width = 16; readable = true; lastProbe = -Infinity; lastFrame = null; gain = target = 1; lastBrightness = null;
      },
      draw(context, video, now, brightness, fresh = false) {
        const brightnessChanged = brightness !== lastBrightness;
        if (probeContext && readable && (fresh || brightnessChanged || now - lastProbe >= 100)) {
          lastProbe = now;
          try {
            probeContext.drawImage(video, 0, 0, 16, 9);
            target = HaloVideo.exposure(probeContext.getImageData(0, 0, 16, 9).data, brightness);
          } catch {
            // Some playable cross-origin media disallows pixel reads. Never retry
            // readback every frame or disable otherwise drawable ambient light.
            readable = false; target = 1;
          }
        }
        const initial = fresh || lastFrame === null || now - lastFrame > 500;
        const alpha = initial ? 1 : HaloVideo.blend(now - lastFrame);
        context.globalAlpha = alpha;
        try { context.drawImage(video, 0, 0, context.canvas.width, context.canvas.height); }
        finally { context.globalAlpha = 1; }
        // Dark transitions decay faster so a black frame does not retain a halo.
        const toneAlpha = initial || brightnessChanged ? 1 : 1 - Math.exp(-Math.max(0, now - lastFrame) / (target < gain ? 65 : 180));
        gain += (target - gain) * toneAlpha;
        const tone = gain.toFixed(4);
        if (context.canvas.style.getPropertyValue('--halo-tone') !== tone) context.canvas.style.setProperty('--halo-tone', tone);
        lastFrame = now; lastBrightness = brightness;
      },
    };
  },
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
        filter: `blur(${height * .0025 * settings.blur}px) brightness(calc(${settings.brightness}% * var(--halo-tone, 1)))`,
      },
    };
  },
};
