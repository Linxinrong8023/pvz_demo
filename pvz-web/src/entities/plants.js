import { cellCenter, nextId } from "../game/state.js";

export function createPlantEntity(state, def, row, col, nowMs) {
  const pos = cellCenter(row, col);
  const plant = {
    id: nextId(state, "plant"),
    type: def.id,
    row,
    col,
    x: pos.x,
    y: pos.y,
    hp: def.hp,
    maxHp: def.hp,
    attack: def.attack,
    intervalMs: def.intervalMs,
    projectileSpeed: def.projectileSpeed ?? 0,
    special: def.special,
    nextActionAtMs: nowMs + Math.max(300, def.intervalMs || 1000),
    armed: def.special !== "mine",
    armedAtMs: def.special === "mine" ? nowMs + (def.armMs ?? 14000) : nowMs,
    explodeAtMs: def.special === "cherry" ? nowMs + 450 : 0,
    swayPhase: state.rng() * Math.PI * 2,
    hurtMs: 0,
  };
  return plant;
}
