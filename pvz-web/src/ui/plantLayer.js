import { BOARD, SCENES } from "../game/config.js";

function plantMetrics(type) {
  if (type === "sunflower") return { width: BOARD.cellW * 0.88, height: BOARD.cellH * 0.82, baseYRatio: 0.83 };
  if (type === "peashooter") return { width: BOARD.cellW * 0.86, height: BOARD.cellH * 0.79, baseYRatio: 0.83 };
  if (type === "wallnut") return { width: BOARD.cellW * 0.78, height: BOARD.cellH * 0.8, baseYRatio: 0.84 };
  if (type === "potatomine") return { width: BOARD.cellW * 0.9, height: BOARD.cellH * 0.58, baseYRatio: 0.86 };
  if (type === "cherrybomb") return { width: BOARD.cellW * 1.18, height: BOARD.cellH * 0.9, baseYRatio: 0.84 };
  return { width: BOARD.cellW * 0.86, height: BOARD.cellH * 0.8, baseYRatio: 0.83 };
}

function pickPlantUrl(assetUrls, plant) {
  const plants = assetUrls?.plants || {};
  if (plant.type === "sunflower") return plants.sunflower;
  if (plant.type === "peashooter") return plants.peashooter;
  if (plant.type === "cherrybomb") return plants.cherrybomb;
  if (plant.type === "potatomine") return plant.armed ? plants.potatomine : plants.potatomineUnarmed;
  if (plant.type === "wallnut") {
    const ratio = plant.maxHp > 0 ? plant.hp / plant.maxHp : 1;
    if (ratio <= 0.33) return plants.wallnutCracked2 || plants.wallnutCracked1 || plants.wallnut;
    if (ratio <= 0.66) return plants.wallnutCracked1 || plants.wallnut;
    return plants.wallnut;
  }
  return "";
}

function plantLayout(plant) {
  const laneTop = BOARD.y + plant.row * BOARD.cellH;
  const m = plantMetrics(plant.type);
  return {
    x: plant.x - m.width / 2,
    y: laneTop + BOARD.cellH * m.baseYRatio - m.height,
    width: m.width,
    height: m.height,
  };
}

function createPlantNode(id) {
  const img = document.createElement("img");
  img.className = "plant-gif";
  img.alt = "";
  img.draggable = false;
  img.dataset.plantId = id;
  return img;
}

export function createPlantLayer(stageEl, canvas, assetUrls, beforeEl = null) {
  const layer = document.createElement("div");
  layer.className = "plant-gif-layer";
  if (beforeEl) {
    stageEl.insertBefore(layer, beforeEl);
  } else {
    stageEl.appendChild(layer);
  }

  const nodes = new Map();

  function syncScale() {
    const sx = canvas.clientWidth / canvas.width;
    const sy = canvas.clientHeight / canvas.height;
    layer.style.width = `${canvas.width}px`;
    layer.style.height = `${canvas.height}px`;
    layer.style.transformOrigin = "top left";
    layer.style.transform = `scale(${sx}, ${sy})`;
  }

  function ensureNode(plant) {
    let node = nodes.get(plant.id);
    if (!node) {
      node = createPlantNode(plant.id);
      nodes.set(plant.id, node);
      layer.appendChild(node);
    }
    return node;
  }

  function prune(seenIds) {
    nodes.forEach((node, id) => {
      if (seenIds.has(id)) return;
      node.remove();
      nodes.delete(id);
    });
  }

  return {
    update(state) {
      syncScale();
      const activeScene =
        state.scene === SCENES.playing || state.scene === SCENES.paused || state.scene === SCENES.result;
      layer.classList.toggle("hidden", !activeScene);
      if (!activeScene) {
        prune(new Set());
        return;
      }

      const seen = new Set();
      state.plants.forEach((plant) => {
        const src = pickPlantUrl(assetUrls, plant);
        if (!src) return;
        const node = ensureNode(plant);
        const layout = plantLayout(plant);
        if (node.dataset.src !== src) {
          node.src = src;
          node.dataset.src = src;
        }
        node.style.left = `${layout.x}px`;
        node.style.top = `${layout.y}px`;
        node.style.width = `${layout.width}px`;
        node.style.height = `${layout.height}px`;
        node.style.zIndex = `${220 + plant.row * 8}`;
        seen.add(plant.id);
      });
      prune(seen);
    },
    destroy() {
      prune(new Set());
      layer.remove();
    },
  };
}
