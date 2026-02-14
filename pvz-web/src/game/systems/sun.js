import { BOARD, SUN_RULES, clamp } from "../config.js";
import { nextId } from "../state.js";

export function createSunToken(state, token) {
  state.sunTokens.push({
    id: nextId(state, "sun"),
    x: token.x,
    y: token.y,
    value: token.value,
    falling: Boolean(token.falling),
    fallToY: token.fallToY ?? token.y,
    createdAtMs: token.createdAtMs,
    expiresAtMs: token.expiresAtMs,
    autoCollectAtMs:
      typeof token.autoCollectAtMs === "number"
        ? token.autoCollectAtMs
        : token.createdAtMs + 4200,
    driftPhase: state.rng() * Math.PI * 2,
  });
}

export function collectSunTokenById(state, id) {
  const token = state.sunTokens.find((item) => item.id === id);
  if (!token) return false;
  state.sun = clamp(state.sun + token.value, 0, 9999);
  state.sunTokens = state.sunTokens.filter((item) => item.id !== id);
  return true;
}

export function collectSunAt(state, x, y) {
  const hit = state.sunTokens.find((token) => {
    const dx = token.x - x;
    const dy = token.y - y;
    return Math.hypot(dx, dy) < 42;
  });
  if (!hit) return false;
  return collectSunTokenById(state, hit.id);
}

function spawnSkySun(state, nowMs) {
  const x = BOARD.x + 20 + state.rng() * (BOARD.cols * BOARD.cellW - 40);
  const y = BOARD.y - 24;
  const fallToY = BOARD.y + 16 + state.rng() * (BOARD.rows * BOARD.cellH - 26);
  createSunToken(state, {
    x,
    y,
    value: SUN_RULES.skyValue,
    falling: true,
    fallToY,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + SUN_RULES.sunLifetimeMs + 3500,
    autoCollectAtMs: nowMs + 5200,
  });
}

function spawnSunflowerSun(state, plant, nowMs) {
  createSunToken(state, {
    x: plant.x + (state.rng() - 0.5) * 16,
    y: plant.y - BOARD.cellH * 0.58,
    value: SUN_RULES.sunflowerValue,
    falling: false,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + SUN_RULES.sunLifetimeMs,
    autoCollectAtMs: nowMs + 2600,
  });
}

export function updateSunSystem(state, dtMs, nowMs) {
  if (typeof state.skySunTimerMs !== "number" || state.skySunTimerMs <= 0) {
    state.skySunTimerMs = SUN_RULES.skyIntervalMs;
  }
  state.skySunTimerMs -= dtMs;
  while (state.skySunTimerMs <= 0) {
    spawnSkySun(state, nowMs);
    state.skySunTimerMs += SUN_RULES.skyIntervalMs;
  }

  const dtSec = dtMs / 1000;
  state.sunTokens.forEach((token) => {
    token.driftPhase += dtMs * 0.0035;
    token.x += Math.sin(token.driftPhase) * 0.12;
    if (token.falling) {
      token.y += SUN_RULES.sunFallSpeed * dtSec;
      if (token.y >= token.fallToY) {
        token.y = token.fallToY;
        token.falling = false;
      }
    }
  });

  const autoCollectIds = [];
  state.sunTokens.forEach((token) => {
    if (nowMs >= token.autoCollectAtMs) {
      autoCollectIds.push(token.id);
    }
  });
  autoCollectIds.forEach((id) => {
    collectSunTokenById(state, id);
  });

  state.plants.forEach((plant) => {
    if (plant.type !== "sunflower") return;
    if (nowMs >= plant.nextActionAtMs) {
      spawnSunflowerSun(state, plant, nowMs);
      plant.nextActionAtMs = nowMs + plant.intervalMs;
    }
  });

  state.sunTokens = state.sunTokens.filter((token) => nowMs <= token.expiresAtMs);
}
