import { clamp } from "../config.js";
import { createZombieEntity } from "../../entities/zombies.js";

export function updateWaveSystem(state, nowMs) {
  if (!state.levelStarted) return;
  const elapsed = nowMs - state.waves.startedAtMs;
  const table = state.levelConfig.spawnTable;

  if (typeof state.waves.nextSpawnGateMs !== "number") {
    state.waves.nextSpawnGateMs = 0;
  }
  if (nowMs < state.waves.nextSpawnGateMs) {
    return;
  }
  if (state.waves.cursor >= table.length) {
    return;
  }

  const event = table[state.waves.cursor];
  if (elapsed < event.atSec * 1000) {
    return;
  }

  const def = state.zombieDefsById[event.type];
  if (def) {
    const row = clamp(event.row, 0, state.levelConfig.grid.rows - 1);
    state.zombies.push(createZombieEntity(state, def, row));
    state.hudMessage = event.isFlagWave ? "Flag wave incoming" : "Zombies approaching";
  }
  state.waves.cursor += 1;
  // Prevent backlog from dumping a full screen of zombies in one frame.
  state.waves.nextSpawnGateMs = nowMs + 520;
}
