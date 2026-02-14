import { nextId } from "../game/state.js";

export function createProjectile(state, payload) {
  return {
    id: nextId(state, "pea"),
    row: payload.row,
    x: payload.x,
    y: payload.y,
    damage: payload.damage,
    speed: payload.speed,
    ttlMs: 6000,
  };
}
