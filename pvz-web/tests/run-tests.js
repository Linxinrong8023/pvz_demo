import assert from "node:assert/strict";
import { SCENES } from "../src/game/config.js";
import { createInitialState } from "../src/game/state.js";
import { placePlant } from "../src/game/systems/placement.js";
import { collectSunAt, createSunToken, updateSunSystem } from "../src/game/systems/sun.js";
import { updateWaveSystem } from "../src/game/systems/waves.js";
import { updateCombatSystem } from "../src/game/systems/combat.js";

const PLANTS = [
  {
    id: "sunflower",
    name: "Sunflower",
    cost: 50,
    cooldownMs: 7500,
    hp: 300,
    attack: 0,
    intervalMs: 24000,
    special: "sun",
  },
  {
    id: "peashooter",
    name: "Peashooter",
    cost: 100,
    cooldownMs: 7500,
    hp: 300,
    attack: 20,
    intervalMs: 1400,
    projectileSpeed: 260,
    special: "projectile",
  },
  {
    id: "potatomine",
    name: "Potato Mine",
    cost: 25,
    cooldownMs: 30000,
    hp: 300,
    attack: 9999,
    intervalMs: 0,
    armMs: 14000,
    special: "mine",
  },
];

const ZOMBIES = [
  {
    id: "normal",
    hp: 270,
    speedPxPerSec: 18,
    dps: 36,
    rewardSun: 0,
  },
];

const LEVEL = {
  id: "1-1",
  grid: { rows: 5, cols: 9 },
  initialSun: 300,
  waves: 1,
  musicId: "day_01",
  spawnTable: [{ atSec: 0, row: 0, type: "normal" }],
};

function createState() {
  const state = createInitialState({
    levelConfig: structuredClone(LEVEL),
    plantDefs: structuredClone(PLANTS),
    zombieDefs: structuredClone(ZOMBIES),
    progress: { completedLevels: {}, lastLevelId: null },
    settings: { volume: 0.7, language: "zh-CN", muted: true },
    seed: 1,
  });
  state.scene = SCENES.playing;
  state.levelStarted = true;
  state.frameNowMs = 0;
  state.waves.startedAtMs = 0;
  return state;
}

function testPlacement() {
  const state = createState();
  const ok = placePlant(state, 2, 2, "sunflower", 1000);
  assert.equal(ok.ok, true);
  assert.equal(state.grid[2][2] !== null, true);
  assert.equal(state.sun, 250);
  const failCooldown = placePlant(state, 2, 3, "sunflower", 1500);
  assert.equal(failCooldown.ok, false);
  assert.equal(failCooldown.reason, "cooldown");
}

function testSunCollect() {
  const state = createState();
  const before = state.sun;
  createSunToken(state, {
    x: 300,
    y: 220,
    value: 25,
    falling: false,
    createdAtMs: 0,
    expiresAtMs: 5000,
  });
  const collected = collectSunAt(state, 300, 220);
  assert.equal(collected, true);
  assert.equal(state.sun, before + 25);

  state.skySunTimerMs = 20;
  updateSunSystem(state, 100, 100);
  assert.equal(state.sunTokens.length > 0, true);
}

function testWaveSpawn() {
  const state = createState();
  updateWaveSystem(state, 1000);
  assert.equal(state.zombies.length, 1);
  assert.equal(state.waves.cursor, 1);
}

function testCombatProjectile() {
  const state = createState();
  placePlant(state, 0, 0, "peashooter", 0);
  state.zombies.push({
    id: "z1",
    type: "normal",
    row: 0,
    x: 400,
    hp: 40,
    maxHp: 40,
    speedPxPerSec: 0,
    dps: 10,
    rewardSun: 0,
    eatingPlantId: null,
  });
  let now = 0;
  for (let i = 0; i < 80; i += 1) {
    now += 100;
    updateCombatSystem(state, 100, now);
  }
  const zombie = state.zombies.find((z) => z.id === "z1");
  assert.equal(Boolean(zombie), false);
}

function run() {
  const tests = [testPlacement, testSunCollect, testWaveSpawn, testCombatProjectile];
  tests.forEach((testFn) => testFn());
  console.log(`PASS ${tests.length} tests`);
}

run();
