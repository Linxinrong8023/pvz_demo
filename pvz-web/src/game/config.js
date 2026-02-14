export const STORAGE_KEYS = {
  progress: "pvz.progress.v1",
  settings: "pvz.settings.v1",
};

export const SCENES = {
  menu: "menu",
  levelSelect: "level-select",
  settings: "settings",
  playing: "playing",
  paused: "paused",
  result: "result",
};

export const CANVAS = {
  width: 1400,
  height: 600,
};

export const BOARD = {
  x: 244,
  y: 96,
  rows: 5,
  cols: 9,
  cellW: 84,
  cellH: 92,
  houseX: 208,
  mowerStartX: 222,
  mowerSpeed: 440,
  zombieSpawnX: 1190,
};

export const SUN_RULES = {
  skyIntervalMs: 10000,
  skyValue: 25,
  sunflowerValue: 25,
  sunFallSpeed: 110,
  sunLifetimeMs: 9000,
};

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function cellToPixel(row, col) {
  return {
    x: BOARD.x + col * BOARD.cellW + BOARD.cellW / 2,
    y: BOARD.y + row * BOARD.cellH + BOARD.cellH / 2,
  };
}

export function pixelToCell(x, y) {
  if (
    x < BOARD.x ||
    y < BOARD.y ||
    x >= BOARD.x + BOARD.cols * BOARD.cellW ||
    y >= BOARD.y + BOARD.rows * BOARD.cellH
  ) {
    return null;
  }
  const col = Math.floor((x - BOARD.x) / BOARD.cellW);
  const row = Math.floor((y - BOARD.y) / BOARD.cellH);
  const localX = x - (BOARD.x + col * BOARD.cellW);
  const localY = y - (BOARD.y + row * BOARD.cellH);

  // Narrow the valid plantable area to avoid out-of-lawn placement near tile edges.
  const marginX = BOARD.cellW * 0.1;
  const marginY = BOARD.cellH * 0.1;
  if (
    localX < marginX ||
    localX > BOARD.cellW - marginX ||
    localY < marginY ||
    localY > BOARD.cellH - marginY
  ) {
    return null;
  }

  return { col, row };
}

export function makeRng(seed = Date.now()) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
