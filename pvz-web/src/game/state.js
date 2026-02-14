import { BOARD, SCENES, cellToPixel, makeRng } from "./config.js";

/**
 * @typedef {Object} PlantDef
 * @property {string} id
 * @property {string} name
 * @property {number} cost
 * @property {number} cooldownMs
 * @property {number} hp
 * @property {number} attack
 * @property {number} intervalMs
 * @property {string} special
 */

/**
 * @typedef {Object} ZombieDef
 * @property {string} id
 * @property {number} hp
 * @property {number} speedPxPerSec
 * @property {number} dps
 * @property {number} rewardSun
 */

/**
 * @typedef {Object} LevelConfig
 * @property {string} id
 * @property {{rows: number, cols: number}} grid
 * @property {number} initialSun
 * @property {number} waves
 * @property {Array<{atSec:number,row:number,type:string,isFlagWave?:boolean}>} spawnTable
 * @property {string} musicId
 */

/**
 * @typedef {Object} GameState
 * @property {string} scene
 * @property {number} timeMs
 * @property {number} sun
 * @property {Array<Array<string|null>>} grid
 * @property {Array<Object>} plants
 * @property {Array<Object>} zombies
 * @property {Array<Object>} projectiles
 * @property {Array<Object>} sunTokens
 * @property {Array<Object>} effects
 * @property {{cursor:number,total:number,startedAtMs:number}} waves
 * @property {Array<Object>} mowers
 * @property {null|{outcome:"win"|"lose"}} result
 * @property {null|{row:number,col:number,valid:boolean}} hoverCell
 */

export function makePlantMap(plantDefs) {
  const map = {};
  plantDefs.forEach((def) => {
    map[def.id] = def;
  });
  return map;
}

export function makeZombieMap(zombieDefs) {
  const map = {};
  zombieDefs.forEach((def) => {
    map[def.id] = def;
  });
  return map;
}

function createGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
}

function createMowers(rows) {
  return Array.from({ length: rows }, (_, row) => ({
    id: `mower-${row}`,
    row,
    x: BOARD.mowerStartX,
    active: true,
    moving: false,
  }));
}

export function nextId(state, prefix) {
  state.idCounter += 1;
  return `${prefix}-${state.idCounter}`;
}

export function createInitialState({
  levelConfig,
  plantDefs,
  zombieDefs,
  progress,
  settings,
  seed = Date.now(),
}) {
  const rows = levelConfig?.grid?.rows ?? BOARD.rows;
  const cols = levelConfig?.grid?.cols ?? BOARD.cols;
  return {
    scene: SCENES.menu,
    timeMs: 0,
    sun: levelConfig.initialSun,
    grid: createGrid(rows, cols),
    plants: [],
    zombies: [],
    projectiles: [],
    sunTokens: [],
    effects: [],
    waves: {
      cursor: 0,
      total: levelConfig.spawnTable.length,
      startedAtMs: 0,
      nextSpawnGateMs: 0,
    },
    mowers: createMowers(rows),
    result: null,
    levelConfig,
    plantDefs,
    plantDefsById: makePlantMap(plantDefs),
    zombieDefs,
    zombieDefsById: makeZombieMap(zombieDefs),
    progress,
    settings,
    selectedCardId: null,
    shovelMode: false,
    hudMessage: "Ready to plant",
    cardCooldownUntil: {},
    idCounter: 0,
    rng: makeRng(seed),
    frameNowMs: 0,
    levelStarted: false,
    levelId: levelConfig.id,
    cameraShakeMs: 0,
    loseRow: null,
    hoverCell: null,
    skySunTimerMs: 0,
  };
}

export function resetBattleState(state) {
  const rows = state.levelConfig.grid.rows;
  const cols = state.levelConfig.grid.cols;
  state.timeMs = 0;
  state.sun = state.levelConfig.initialSun;
  state.grid = createGrid(rows, cols);
  state.plants = [];
  state.zombies = [];
  state.projectiles = [];
  state.sunTokens = [];
  state.effects = [];
  state.waves.cursor = 0;
  state.waves.startedAtMs = 0;
  state.waves.nextSpawnGateMs = 0;
  state.mowers = createMowers(rows);
  state.result = null;
  state.selectedCardId = null;
  state.shovelMode = false;
  state.hudMessage = "Ready to plant";
  state.cardCooldownUntil = {};
  state.levelStarted = false;
  state.cameraShakeMs = 0;
  state.loseRow = null;
  state.hoverCell = null;
  state.frameNowMs = 0;
  state.skySunTimerMs = 0;
}

export function findPlantAtCell(state, row, col) {
  const id = state.grid[row]?.[col];
  if (!id) return null;
  return state.plants.find((p) => p.id === id) ?? null;
}

export function removePlantById(state, plantId) {
  const plant = state.plants.find((p) => p.id === plantId);
  if (!plant) return;
  if (state.grid[plant.row] && state.grid[plant.row][plant.col] === plant.id) {
    state.grid[plant.row][plant.col] = null;
  }
  state.plants = state.plants.filter((p) => p.id !== plantId);
}

export function cellCenter(row, col) {
  return cellToPixel(row, col);
}
