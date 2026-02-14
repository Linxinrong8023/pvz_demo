import { BOARD, SCENES, clamp } from "../config.js";
import { findPlantAtCell, removePlantById } from "../state.js";
import { createPlantEntity } from "../../entities/plants.js";

function validateCell(row, col) {
  return row >= 0 && row < BOARD.rows && col >= 0 && col < BOARD.cols;
}

export function canPlacePlant(state, row, col, cardId, nowMs) {
  if (state.scene !== SCENES.playing) return { ok: false, reason: "not-playing" };
  if (!validateCell(row, col)) return { ok: false, reason: "invalid-cell" };
  if (findPlantAtCell(state, row, col)) return { ok: false, reason: "occupied" };
  const def = state.plantDefsById[cardId];
  if (!def) return { ok: false, reason: "missing-card" };
  if (state.sun < def.cost) return { ok: false, reason: "not-enough-sun" };
  const cooldownUntil = state.cardCooldownUntil[cardId] ?? 0;
  if (nowMs < cooldownUntil) return { ok: false, reason: "cooldown" };
  return { ok: true, reason: "ok" };
}

export function placePlant(state, row, col, cardId, nowMs) {
  const check = canPlacePlant(state, row, col, cardId, nowMs);
  if (!check.ok) return check;
  const def = state.plantDefsById[cardId];
  const plant = createPlantEntity(state, def, row, col, nowMs);
  state.sun = clamp(state.sun - def.cost, 0, 9999);
  state.cardCooldownUntil[cardId] = nowMs + def.cooldownMs;
  state.plants.push(plant);
  state.grid[row][col] = plant.id;
  state.hudMessage = `Planted ${def.name}`;
  return { ok: true, reason: "ok", plant };
}

export function removePlant(state, row, col) {
  if (state.scene !== SCENES.playing) return { ok: false, reason: "not-playing" };
  if (!validateCell(row, col)) return { ok: false, reason: "invalid-cell" };
  const plant = findPlantAtCell(state, row, col);
  if (!plant) return { ok: false, reason: "empty" };
  removePlantById(state, plant.id);
  state.hudMessage = "Plant removed";
  return { ok: true, reason: "ok" };
}
