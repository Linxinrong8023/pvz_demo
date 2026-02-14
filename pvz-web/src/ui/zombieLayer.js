import { BOARD, SCENES } from "../game/config.js";

function pickZombieUrl(assetUrls, zombie) {
  const zombies = assetUrls?.zombies || {};
  if (zombie.type === "normal") {
    return zombie.eatingPlantId ? zombies.normalAttack : zombies.normalWalk;
  }
  if (zombie.type === "conehead") {
    return zombie.eatingPlantId ? zombies.coneAttack : zombies.coneWalk;
  }
  if (zombie.type === "flag") {
    return zombie.eatingPlantId ? zombies.normalAttack : zombies.flagWalk || zombies.normalWalk;
  }
  return zombies.normalWalk;
}

function zombieLayout(zombie) {
  const laneTop = BOARD.y + zombie.row * BOARD.cellH;
  const width = BOARD.cellW * 1.98;
  const height = BOARD.cellH * 1.565;
  const footY = laneTop + BOARD.cellH * 0.78;
  const biteNudge = zombie.eatingPlantId ? -2.4 : 0;
  return {
    x: zombie.x - width * 0.63 + biteNudge,
    y: footY - height,
    width,
    height,
  };
}

function createZombieNode(id) {
  const img = document.createElement("img");
  img.className = "zombie-gif";
  img.alt = "";
  img.draggable = false;
  img.dataset.zombieId = id;
  return img;
}

export function createZombieLayer(stageEl, canvas, assetUrls, beforeEl = null) {
  const layer = document.createElement("div");
  layer.className = "zombie-gif-layer";
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

  function ensureNode(zombie) {
    let node = nodes.get(zombie.id);
    if (!node) {
      node = createZombieNode(zombie.id);
      nodes.set(zombie.id, node);
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
      state.zombies.forEach((zombie) => {
        if (zombie.hp <= 0) return;
        const src = pickZombieUrl(assetUrls, zombie);
        if (!src) return;
        const node = ensureNode(zombie);
        const layout = zombieLayout(zombie);
        if (node.dataset.src !== src) {
          node.src = src;
          node.dataset.src = src;
        }
        node.style.left = `${layout.x}px`;
        node.style.top = `${layout.y}px`;
        node.style.width = `${layout.width}px`;
        node.style.height = `${layout.height}px`;
        node.style.zIndex = `${400 + zombie.row * 8}`;
        seen.add(zombie.id);
      });
      prune(seen);
    },
    clear() {
      prune(new Set());
    },
    destroy() {
      prune(new Set());
      layer.remove();
    },
  };
}
