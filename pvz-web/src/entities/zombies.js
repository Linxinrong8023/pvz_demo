import { BOARD } from "../game/config.js";
import { nextId } from "../game/state.js";

export function createZombieEntity(state, def, row) {
  return {
    id: nextId(state, "zombie"),
    type: def.id,
    row,
    x: BOARD.zombieSpawnX + state.rng() * 32,
    hp: def.hp,
    maxHp: def.hp,
    speedPxPerSec: def.speedPxPerSec,
    dps: def.dps,
    rewardSun: def.rewardSun,
    eatingPlantId: null,
    walkPhase: state.rng() * Math.PI * 2,
    bobY: 0,
    hurtMs: 0,
  };
}
