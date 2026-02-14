import { BOARD, SCENES } from "../config.js";
import { createProjectile } from "../../entities/projectiles.js";
import { removePlantById, nextId } from "../state.js";

function addEffect(state, effect) {
  state.effects.push({
    id: nextId(state, "fx"),
    ttlMs: effect.ttlMs ?? 220,
    maxTtlMs: effect.ttlMs ?? 220,
    ...effect,
  });
}

function peashooterMuzzle(plant) {
  return {
    x: plant.x + BOARD.cellW * 0.28,
    y: plant.y - BOARD.cellH * 0.19,
  };
}

function plantBodyHalfWidth(plant) {
  if (plant.type === "wallnut") return BOARD.cellW * 0.39;
  if (plant.type === "cherrybomb") return BOARD.cellW * 0.5;
  if (plant.type === "potatomine") return BOARD.cellW * 0.42;
  return BOARD.cellW * 0.34;
}

function findPlantToBite(state, zombie) {
  // Keep bite target stable to avoid walk/attack animation flicker.
  if (zombie.eatingPlantId) {
    const locked = state.plants.find((p) => p.id === zombie.eatingPlantId);
    if (locked && locked.row === zombie.row) {
      const half = plantBodyHalfWidth(locked);
      const minX = locked.x - half - 4;
      const maxX = locked.x + half + 8;
      if (zombie.x >= minX && zombie.x <= maxX) {
        return locked;
      }
    }
  }

  let target = null;
  let bestX = -Infinity;
  state.plants.forEach((plant) => {
    if (plant.row !== zombie.row) return;
    const half = plantBodyHalfWidth(plant);
    const minX = plant.x - half - 2;
    const maxX = plant.x + half + 5;
    if (zombie.x < minX || zombie.x > maxX) return;
    if (plant.x > bestX) {
      bestX = plant.x;
      target = plant;
    }
  });
  return target;
}

function findZombieAhead(state, row, x) {
  return state.zombies.find((z) => z.row === row && z.hp > 0 && z.x > x - 12);
}

function killZombie(state, zombie) {
  zombie.hp = 0;
  if (zombie.rewardSun > 0) {
    state.sun += zombie.rewardSun;
  }
  addEffect(state, {
    type: "zombie-death",
    x: zombie.x,
    y: BOARD.y + zombie.row * BOARD.cellH + BOARD.cellH * 0.5,
    ttlMs: 360,
  });
}

function updatePlantSkills(state, nowMs) {
  const toRemove = new Set();
  state.plants.forEach((plant) => {
    if (plant.type === "cherrybomb" && nowMs >= plant.explodeAtMs) {
      const radius = BOARD.cellW * 1.6;
      state.zombies.forEach((zombie) => {
        const dx = zombie.x - plant.x;
        const dy = (zombie.row - plant.row) * BOARD.cellH;
        if (Math.hypot(dx, dy) <= radius) {
          killZombie(state, zombie);
        }
      });
      toRemove.add(plant.id);
      state.cameraShakeMs = 240;
      state.hudMessage = "Cherry Bomb exploded";
      addEffect(state, {
        type: "explosion",
        x: plant.x,
        y: plant.y,
        ttlMs: 420,
      });
      return;
    }

    if (plant.type === "potatomine") {
      if (!plant.armed && nowMs >= plant.armedAtMs) {
        plant.armed = true;
        state.hudMessage = "Potato mine armed";
      }
      if (plant.armed) {
        const hit = state.zombies.find(
          (zombie) =>
            zombie.row === plant.row &&
            zombie.hp > 0 &&
            zombie.x <= plant.x + 26 &&
            zombie.x >= plant.x - 30
        );
        if (hit) {
          killZombie(state, hit);
          toRemove.add(plant.id);
          state.cameraShakeMs = 190;
          state.hudMessage = "Potato mine triggered";
          addEffect(state, {
            type: "explosion",
            x: plant.x,
            y: plant.y + 4,
            ttlMs: 320,
          });
        }
      }
      return;
    }

    if (plant.type === "peashooter" && nowMs >= plant.nextActionAtMs) {
      const target = findZombieAhead(state, plant.row, plant.x);
      if (target) {
        const muzzle = peashooterMuzzle(plant);
        state.projectiles.push(
          createProjectile(state, {
            row: plant.row,
            x: muzzle.x,
            y: muzzle.y,
            damage: plant.attack,
            speed: plant.projectileSpeed || 240,
          })
        );
        plant.nextActionAtMs = nowMs + plant.intervalMs;
        addEffect(state, {
          type: "muzzle",
          x: muzzle.x,
          y: muzzle.y,
          ttlMs: 90,
        });
      }
    }
  });
  toRemove.forEach((id) => removePlantById(state, id));
}

function updateProjectiles(state, dtMs) {
  const dtSec = dtMs / 1000;
  const remaining = [];
  state.projectiles.forEach((shot) => {
    shot.x += shot.speed * dtSec;
    shot.ttlMs -= dtMs;
    if (shot.ttlMs <= 0) return;

    const hit = state.zombies.find((zombie) => {
      if (zombie.row !== shot.row || zombie.hp <= 0) return false;
      const bodyX = zombie.x - BOARD.cellW * 0.16;
      return Math.abs(bodyX - shot.x) < 24;
    });
    if (hit) {
      hit.hp -= shot.damage;
      hit.hurtMs = 120;
      addEffect(state, {
        type: "pea-hit",
        x: hit.x - BOARD.cellW * 0.16,
        y: BOARD.y + hit.row * BOARD.cellH + BOARD.cellH * 0.38,
        ttlMs: 120,
      });
      return;
    }
    if (shot.x < BOARD.x + BOARD.cols * BOARD.cellW + 130) {
      remaining.push(shot);
    }
  });
  state.projectiles = remaining;
}

function tryTriggerMower(state, zombie) {
  const mower = state.mowers[zombie.row];
  if (!mower) return false;
  if (mower.active) {
    mower.active = false;
    mower.moving = true;
    mower.x = Math.max(mower.x, BOARD.houseX - 4);
    state.hudMessage = `Row ${zombie.row + 1} mower triggered`;
    addEffect(state, {
      type: "mower",
      x: mower.x,
      y: BOARD.y + zombie.row * BOARD.cellH + BOARD.cellH / 2,
      ttlMs: 260,
    });
    return true;
  }
  return false;
}

function updateMowers(state, dtMs) {
  const dtSec = dtMs / 1000;
  state.mowers.forEach((mower) => {
    if (!mower.moving) return;
    mower.x += BOARD.mowerSpeed * dtSec;
    state.zombies.forEach((zombie) => {
      if (zombie.row !== mower.row || zombie.hp <= 0) return;
      if (zombie.x < mower.x + 50 && zombie.x > mower.x - 120) {
        killZombie(state, zombie);
      }
    });
    if (mower.x > BOARD.x + BOARD.cols * BOARD.cellW + 180) {
      mower.moving = false;
    }
  });
}

function updateZombieMovement(state, dtMs) {
  const dtSec = dtMs / 1000;
  state.zombies.forEach((zombie) => {
    if (zombie.hp <= 0) return;

    const plant = findPlantToBite(state, zombie);
    zombie.hurtMs = Math.max(0, zombie.hurtMs - dtMs);

    if (plant) {
      zombie.eatingPlantId = plant.id;
      zombie.walkPhase += dtMs * 0.016;
      zombie.bobY = 0;
      plant.hp -= zombie.dps * dtSec;
      plant.hurtMs = Math.max(plant.hurtMs || 0, 70);
      zombie.nextBiteFxMs = zombie.nextBiteFxMs || 0;
      if (state.timeMs >= zombie.nextBiteFxMs) {
        addEffect(state, {
          type: "bite",
          x: zombie.x - BOARD.cellW * 0.04,
          y: plant.y - BOARD.cellH * 0.14,
          ttlMs: 180,
        });
        zombie.nextBiteFxMs = state.timeMs + 200;
      }
      if (plant.hp <= 0) {
        removePlantById(state, plant.id);
        zombie.eatingPlantId = null;
      }
      return;
    }

    zombie.eatingPlantId = null;
    zombie.x -= zombie.speedPxPerSec * dtSec;
    zombie.walkPhase += dtMs * 0.0105 * (zombie.speedPxPerSec / 10);
    zombie.bobY = 0;

    if (zombie.x <= BOARD.houseX) {
      const saved = tryTriggerMower(state, zombie);
      if (!saved) {
        state.result = { outcome: "lose" };
        state.scene = SCENES.result;
        state.loseRow = zombie.row;
      }
    }
  });
}

function updateEffects(state, dtMs) {
  state.effects.forEach((effect) => {
    effect.ttlMs -= dtMs;
  });
  state.effects = state.effects.filter((effect) => effect.ttlMs > 0);
}

function pruneDead(state) {
  state.zombies = state.zombies.filter((zombie) => zombie.hp > 0);
  state.plants.forEach((plant) => {
    plant.hurtMs = Math.max(0, (plant.hurtMs || 0) - 16);
  });
}

function checkWinCondition(state) {
  if (state.scene !== SCENES.playing) return;
  if (state.waves.cursor < state.waves.total) return;
  if (state.zombies.length > 0) return;
  state.result = { outcome: "win" };
  state.scene = SCENES.result;
}

export function updateCombatSystem(state, dtMs, nowMs) {
  if (state.scene !== SCENES.playing) return;
  updatePlantSkills(state, nowMs);
  updateProjectiles(state, dtMs);
  updateZombieMovement(state, dtMs);
  updateMowers(state, dtMs);
  updateEffects(state, dtMs);
  pruneDead(state);
  checkWinCondition(state);
  if (state.cameraShakeMs > 0) {
    state.cameraShakeMs = Math.max(0, state.cameraShakeMs - dtMs);
  }
}
