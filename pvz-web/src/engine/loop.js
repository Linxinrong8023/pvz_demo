export function createLoop({ update, render }) {
  let rafId = 0;
  let hiddenTimer = 0;
  let lastTs = 0;
  let running = false;

  function tick(ts) {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    const dt = ts - lastTs;
    lastTs = ts;
    update(Math.max(0, dt), ts);
  }

  function frame(ts) {
    if (!running) return;
    tick(ts);
    render();
    rafId = requestAnimationFrame(frame);
  }

  function startHiddenTicker() {
    if (hiddenTimer) return;
    hiddenTimer = window.setInterval(() => {
      if (!running) return;
      tick(performance.now());
    }, 1000);
  }

  function stopHiddenTicker() {
    if (!hiddenTimer) return;
    clearInterval(hiddenTimer);
    hiddenTimer = 0;
  }

  function onVisibilityChange() {
    if (!running) return;
    if (document.visibilityState === "hidden") {
      startHiddenTicker();
    } else {
      stopHiddenTicker();
      lastTs = performance.now();
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      lastTs = performance.now();
      document.addEventListener("visibilitychange", onVisibilityChange);
      if (document.visibilityState === "hidden") {
        startHiddenTicker();
      }
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
      rafId = 0;
      stopHiddenTicker();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    },
    isRunning() {
      return running;
    },
  };
}
