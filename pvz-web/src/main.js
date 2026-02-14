import { createLoop } from "./engine/loop.js";
import { renderFrame } from "./engine/renderer.js";
import { bindInput } from "./engine/input.js";
import { createAudioEngine } from "./engine/audio.js";
import { loadAssets } from "./engine/assets.js";
import { BOARD, SCENES, pixelToCell } from "./game/config.js";
import { createInitialState, resetBattleState, findPlantAtCell } from "./game/state.js";
import { placePlant, removePlant, canPlacePlant } from "./game/systems/placement.js";
import { collectSunAt, updateSunSystem } from "./game/systems/sun.js";
import { updateWaveSystem } from "./game/systems/waves.js";
import { updateCombatSystem } from "./game/systems/combat.js";
import {
  loadProgress,
  saveProgress,
  loadSettings,
  saveSettings,
  defaultProgress,
  defaultSettings,
} from "./game/storage.js";
import { createMenuUI } from "./ui/menu.js";
import { createHudUI } from "./ui/hud.js";
import { createPauseUI } from "./ui/pause.js";
import { createResultUI } from "./ui/result.js";
import { createZombieLayer } from "./ui/zombieLayer.js";
import { createPlantLayer } from "./ui/plantLayer.js";

async function loadJson(path) {
  const url = new URL(path, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

async function loadGameData() {
  const [plantDefs, zombieDefs, levelConfig] = await Promise.all([
    loadJson("./data/plants.json"),
    loadJson("./data/zombies.json"),
    loadJson("./data/levels/level_1_1.json"),
  ]);
  return { plantDefs, zombieDefs, levelConfig };
}

function formatHudMessageByReason(reason) {
  if (reason === "occupied") return "Tile occupied";
  if (reason === "not-enough-sun") return "Not enough sun";
  if (reason === "cooldown") return "Card cooling down";
  if (reason === "empty") return "No plant in tile";
  if (reason === "missing-card") return "Select a plant card first";
  if (reason === "invalid-cell") return "Invalid tile";
  return "Action blocked";
}

function isCellInsideLawn(row, col) {
  const left = BOARD.x + col * BOARD.cellW;
  const right = left + BOARD.cellW;
  const top = BOARD.y + row * BOARD.cellH;
  const bottom = top + BOARD.cellH;
  const lawnLeft = BOARD.x;
  const lawnRight = BOARD.x + BOARD.cols * BOARD.cellW;
  const lawnTop = BOARD.y;
  const lawnBottom = BOARD.y + BOARD.rows * BOARD.cellH;
  return left >= lawnLeft && right <= lawnRight && top >= lawnTop && bottom <= lawnBottom;
}

function drawFatal(ctx, message) {
  ctx.fillStyle = "#1b1010";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "#ffdede";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("Load failed", 40, 70);
  ctx.font = "16px sans-serif";
  ctx.fillText(message, 40, 104);
}

/**
 * @param {{canvas: HTMLCanvasElement, seed?: number}} param0
 */
export function createGameApp({ canvas, seed = Date.now() }) {
  const ctx = canvas.getContext("2d");
  const overlayRoot = document.getElementById("overlay-root");
  const progress = loadProgress() || defaultProgress();
  const settings = loadSettings() || defaultSettings();

  let state = null;
  let assets = null;
  let loop = null;
  let inputDispose = null;
  let menuUI = null;
  let hudUI = null;
  let pauseUI = null;
  let resultUI = null;
  let plantLayer = null;
  let zombieLayer = null;
  let audio = null;
  let lastResultOutcome = null;

  function syncSceneUI() {
    if (!state) return;
    const isCompleted = Boolean(state.progress.completedLevels[state.levelId]);
    const canContinue = Boolean(state.progress.lastLevelId);

    if (state.scene === SCENES.menu) {
      menuUI.showMain({ canContinue });
      hudUI.hide();
      pauseUI.hide();
      resultUI.hide();
      audio.stopMusic();
      return;
    }
    if (state.scene === SCENES.levelSelect) {
      menuUI.showLevel({ completed: isCompleted });
      hudUI.hide();
      pauseUI.hide();
      resultUI.hide();
      audio.stopMusic();
      return;
    }
    if (state.scene === SCENES.settings) {
      menuUI.showSettings(state.settings);
      hudUI.hide();
      pauseUI.hide();
      resultUI.hide();
      return;
    }
    if (state.scene === SCENES.playing) {
      menuUI.hideAll();
      hudUI.show();
      pauseUI.hide();
      resultUI.hide();
      return;
    }
    if (state.scene === SCENES.paused) {
      menuUI.hideAll();
      hudUI.show();
      pauseUI.show();
      resultUI.hide();
      return;
    }
    if (state.scene === SCENES.result) {
      menuUI.hideAll();
      hudUI.hide();
      pauseUI.hide();
      resultUI.show(state.result?.outcome || "lose");
      audio.stopMusic();
    }
  }

  function setScene(sceneName) {
    state.scene = sceneName;
    if (sceneName !== SCENES.playing) {
      state.hoverCell = null;
    }
    syncSceneUI();
  }

  function startLevel() {
    resetBattleState(state);
    state.levelStarted = true;
    state.waves.startedAtMs = state.timeMs;
    state.selectedCardId = null;
    state.hudMessage = "Select a card, then click a lawn tile";
    setScene(SCENES.playing);
    audio.playMusic();
    lastResultOutcome = null;
  }

  function goToLevelSelect() {
    setScene(SCENES.levelSelect);
  }

  function handleResult() {
    if (!state.result) return;
    if (state.result.outcome === lastResultOutcome) return;
    lastResultOutcome = state.result.outcome;
    if (state.result.outcome === "win") {
      state.progress.completedLevels[state.levelId] = true;
      state.progress.lastLevelId = state.levelId;
      saveProgress(state.progress);
      audio.play("win");
    } else {
      audio.play("lose");
    }
    syncSceneUI();
  }

  function dispatch(action) {
    if (!state) return { ok: false, reason: "not-ready" };
    if (action.type === "SELECT_CARD") {
      if (!state.plantDefsById[action.cardId]) return { ok: false, reason: "missing-card" };
      if (!state.shovelMode && state.selectedCardId === action.cardId) {
        state.selectedCardId = null;
        state.hudMessage = "Selection canceled";
        return { ok: true, reason: "ok" };
      }
      state.selectedCardId = action.cardId;
      state.shovelMode = false;
      state.hudMessage = `Selected ${state.plantDefsById[action.cardId].name}`;
      return { ok: true, reason: "ok" };
    }

    if (action.type === "PLACE_PLANT") {
      const result = placePlant(state, action.row, action.col, state.selectedCardId, state.frameNowMs);
      if (result.ok) {
        audio.play("plant");
        // Match classic behavior: one click on a card plants once, then card unselects.
        state.selectedCardId = null;
      } else {
        state.hudMessage = formatHudMessageByReason(result.reason);
      }
      return result;
    }

    if (action.type === "REMOVE_PLANT") {
      const result = removePlant(state, action.row, action.col);
      if (!result.ok) {
        state.hudMessage = formatHudMessageByReason(result.reason);
      }
      return result;
    }

    if (action.type === "PAUSE_TOGGLE") {
      if (state.scene === SCENES.playing) {
        setScene(SCENES.paused);
        audio.stopMusic();
      } else if (state.scene === SCENES.paused) {
        setScene(SCENES.playing);
        audio.playMusic();
      }
      return { ok: true, reason: "ok" };
    }
    return { ok: false, reason: "unknown-action" };
  }

  function updateHoverByPoint(x, y) {
    if (!state || state.scene !== SCENES.playing) {
      if (state) state.hoverCell = null;
      return;
    }
    const cell = pixelToCell(x, y);
    if (!cell) {
      state.hoverCell = null;
      return;
    }
    if (!isCellInsideLawn(cell.row, cell.col)) {
      state.hoverCell = null;
      return;
    }
    if (state.shovelMode) {
      state.hoverCell = {
        row: cell.row,
        col: cell.col,
        valid: Boolean(findPlantAtCell(state, cell.row, cell.col)),
      };
      return;
    }
    const valid = Boolean(
      state.selectedCardId &&
        canPlacePlant(state, cell.row, cell.col, state.selectedCardId, state.frameNowMs).ok
    );
    state.hoverCell = {
      row: cell.row,
      col: cell.col,
      valid,
    };
  }

  function onCanvasClick(x, y) {
    if (!state) return;
    audio.unlock();
    const gotSun = collectSunAt(state, x, y);
    if (gotSun) {
      audio.play("sun");
      state.hudMessage = "Sun collected";
      return;
    }
    if (state.scene !== SCENES.playing) return;

    const cell = pixelToCell(x, y);
    if (!cell) {
      if (!state.shovelMode && state.selectedCardId) {
        state.selectedCardId = null;
        state.hudMessage = "Selection canceled";
      }
      state.hoverCell = null;
      return;
    }
    if (!isCellInsideLawn(cell.row, cell.col)) {
      if (!state.shovelMode && state.selectedCardId) {
        state.selectedCardId = null;
        state.hudMessage = "Selection canceled";
      }
      state.hoverCell = null;
      return;
    }

    if (state.shovelMode) {
      dispatch({ type: "REMOVE_PLANT", row: cell.row, col: cell.col });
      updateHoverByPoint(x, y);
      return;
    }
    if (!state.selectedCardId) {
      state.hudMessage = "Select a card first";
      return;
    }
    dispatch({ type: "PLACE_PLANT", row: cell.row, col: cell.col });
    updateHoverByPoint(x, y);
  }

  function onCanvasMove(x, y) {
    updateHoverByPoint(x, y);
  }

  function onCanvasLeave() {
    if (state) state.hoverCell = null;
  }

  function update(dtMs) {
    if (!state) return;
    if (state.scene === SCENES.playing) {
      state.timeMs += dtMs;
      state.frameNowMs = state.timeMs;
      updateSunSystem(state, dtMs, state.timeMs);
      updateWaveSystem(state, state.timeMs);
      updateCombatSystem(state, dtMs, state.timeMs);
      if (state.result) {
        setScene(SCENES.result);
        handleResult();
      }
    } else {
      // Freeze gameplay timers while paused/menu/result.
      state.frameNowMs = state.timeMs;
    }
    hudUI?.update(state);
  }

  function render() {
    if (!state) return;
    renderFrame(ctx, state, assets, { drawPlants: false, drawZombies: false });
    plantLayer?.update(state);
    zombieLayer?.update(state);
  }

  function setupFullscreenToggle() {
    const button = document.getElementById("fullscreen-btn");
    if (!button) return;

    const refreshLabel = () => {
      button.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
    };

    button.addEventListener("click", async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch {
        // Ignore browser-specific fullscreen errors.
      }
      refreshLabel();
    });

    document.addEventListener("fullscreenchange", refreshLabel);
    refreshLabel();
  }

  const initPromise = Promise.all([loadGameData(), loadAssets()])
    .then(([gameData, loadedAssets]) => {
      const { plantDefs, zombieDefs, levelConfig } = gameData;
      assets = loadedAssets;
      state = createInitialState({
        levelConfig,
        plantDefs,
        zombieDefs,
        progress,
        settings,
        seed,
      });
      state.levelConfig.grid.rows = BOARD.rows;
      state.levelConfig.grid.cols = BOARD.cols;

      audio = createAudioEngine(state.settings, {
        musicUrl: assets.urls.music,
      });

      menuUI = createMenuUI(overlayRoot, {
        onStartNew: () => {
          audio.unlock();
          goToLevelSelect();
        },
        onContinue: () => {
          audio.unlock();
          if (state.progress.lastLevelId) {
            startLevel();
          } else {
            goToLevelSelect();
          }
        },
        onOpenSettings: () => setScene(SCENES.settings),
        onEnterLevel: () => {
          audio.unlock();
          startLevel();
        },
        onBackToMenu: () => setScene(SCENES.menu),
        onSaveSettings: (newSettings) => {
          state.settings.volume = Math.max(0, Math.min(1, newSettings.volume));
          state.settings.language = newSettings.language || "zh-CN";
          state.settings.muted = Boolean(newSettings.muted);
          saveSettings(state.settings);
          audio.syncSettings();
          setScene(SCENES.menu);
        },
      });

      hudUI = createHudUI(
        overlayRoot,
        {
          onSelectCard: (cardId) => dispatch({ type: "SELECT_CARD", cardId }),
          onToggleShovel: () => {
            state.shovelMode = !state.shovelMode;
            if (state.shovelMode) {
              state.selectedCardId = null;
            }
            state.hoverCell = null;
          },
          onPause: () => dispatch({ type: "PAUSE_TOGGLE" }),
        },
        plantDefs,
        assets.urls
      );

      pauseUI = createPauseUI(overlayRoot, {
        onResume: () => dispatch({ type: "PAUSE_TOGGLE" }),
        onRestart: () => startLevel(),
        onMenu: () => setScene(SCENES.menu),
      });

      resultUI = createResultUI(
        overlayRoot,
        {
          onRetry: () => startLevel(),
          onBackToLevel: () => goToLevelSelect(),
        },
        assets.urls
      );

      plantLayer = createPlantLayer(canvas.parentElement, canvas, assets.urls, overlayRoot);
      zombieLayer = createZombieLayer(canvas.parentElement, canvas, assets.urls, overlayRoot);

      inputDispose = bindInput({
        canvas,
        state,
        onCanvasClick,
        onCanvasMove,
        onCanvasLeave,
        onPauseToggle: () => dispatch({ type: "PAUSE_TOGGLE" }),
      });

      setupFullscreenToggle();

      loop = createLoop({
        update,
        render,
      });
      setScene(SCENES.menu);
      render();
    })
    .catch((error) => {
      drawFatal(ctx, String(error?.message || error));
      throw error;
    });

  return {
    async start() {
      await initPromise;
      if (!loop.isRunning()) {
        loop.start();
      }
    },
    pause() {
      if (!state) return;
      if (state.scene === SCENES.playing) {
        dispatch({ type: "PAUSE_TOGGLE" });
      }
    },
    resume() {
      if (!state) return;
      if (state.scene === SCENES.paused) {
        dispatch({ type: "PAUSE_TOGGLE" });
      }
    },
    restartLevel() {
      if (!state) return;
      startLevel();
    },
    goToMenu() {
      if (!state) return;
      setScene(SCENES.menu);
    },
    dispatch,
    destroy() {
      inputDispose?.();
      loop?.stop();
      plantLayer?.destroy();
      zombieLayer?.destroy();
      audio?.stopMusic();
    },
  };
}

const canvas = document.getElementById("game-canvas");
if (canvas) {
  const app = createGameApp({ canvas });
  app.start();
  window.pvzApp = app;
}

export { loadProgress, saveProgress };
