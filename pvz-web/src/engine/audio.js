export function createAudioEngine(settingsRef, options = {}) {
  let ctx = null;
  let musicStarted = false;
  const music = options.musicUrl ? new Audio(options.musicUrl) : null;

  if (music) {
    music.loop = true;
    music.preload = "auto";
    music.volume = Math.max(0, Math.min(1, settingsRef.volume ?? 0.7)) * 0.55;
  }

  function ensureContext() {
    if (!ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      ctx = new AudioContext();
    }
    return ctx;
  }

  function syncSettings() {
    if (music) {
      const baseVolume = Math.max(0, Math.min(1, settingsRef.volume ?? 0.7));
      music.volume = settingsRef.muted ? 0 : baseVolume * 0.55;
    }
  }

  function playTone(freq, durationMs, type = "sine", gainValue = 0.06) {
    const audioCtx = ensureContext();
    if (!audioCtx || settingsRef.muted) return;
    const gain = audioCtx.createGain();
    const osc = audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const volume = Math.max(0, Math.min(1, settingsRef.volume ?? 0.7));
    gain.gain.value = gainValue * volume;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + durationMs / 1000);
  }

  function play(eventName) {
    if (eventName === "plant") playTone(420, 90, "triangle", 0.09);
    if (eventName === "sun") playTone(720, 80, "sine", 0.08);
    if (eventName === "hit") playTone(180, 70, "square", 0.04);
    if (eventName === "explode") playTone(120, 180, "sawtooth", 0.1);
    if (eventName === "win") {
      playTone(520, 120, "triangle", 0.08);
      setTimeout(() => playTone(760, 180, "triangle", 0.08), 130);
    }
    if (eventName === "lose") playTone(150, 280, "square", 0.08);
  }

  function unlock() {
    const audioCtx = ensureContext();
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    syncSettings();
    if (music && !musicStarted && !settingsRef.muted) {
      music.play().then(() => {
        musicStarted = true;
      }).catch(() => {
        // Browser blocked autoplay until next interaction.
      });
    }
  }

  function playMusic() {
    if (!music) return;
    syncSettings();
    if (settingsRef.muted) return;
    music.play().then(() => {
      musicStarted = true;
    }).catch(() => {
      // Waiting for user gesture.
    });
  }

  function stopMusic() {
    if (!music) return;
    music.pause();
  }

  return {
    play,
    unlock,
    playMusic,
    stopMusic,
    syncSettings,
  };
}
