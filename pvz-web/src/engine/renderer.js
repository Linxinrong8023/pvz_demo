import { BOARD, CANVAS, SCENES } from "../game/config.js";

function drawImageSafe(ctx, img, x, y, w, h) {
  if (!img) return false;
  ctx.drawImage(img, x, y, w, h);
  return true;
}

function drawBackground(ctx, assets) {
  const bg = assets?.images?.background;
  if (bg) {
    ctx.drawImage(bg, 0, 0, CANVAS.width, CANVAS.height);
    return;
  }
  const sky = ctx.createLinearGradient(0, 0, 0, CANVAS.height);
  sky.addColorStop(0, "#8fc9f5");
  sky.addColorStop(0.45, "#9fdb7d");
  sky.addColorStop(1, "#72b34e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
}

function drawLawnPlayableMask(ctx) {
  const boardW = BOARD.cols * BOARD.cellW;
  const boardH = BOARD.rows * BOARD.cellH;
  const topMaskHeight = BOARD.cellH * 1.02;
  const topY = BOARD.y - topMaskHeight;
  const grad = ctx.createLinearGradient(0, topY, 0, BOARD.y + 2);
  grad.addColorStop(0, "rgba(9, 18, 7, 0.76)");
  grad.addColorStop(0.58, "rgba(9, 18, 7, 0.6)");
  grad.addColorStop(1, "rgba(9, 18, 7, 0.08)");
  ctx.fillStyle = grad;
  ctx.fillRect(BOARD.x, topY, boardW, topMaskHeight + 2);

  ctx.strokeStyle = "rgba(247, 255, 212, 0.2)";
  ctx.lineWidth = 2;
  ctx.strokeRect(BOARD.x + 1, BOARD.y + 1, boardW - 2, boardH - 2);
}

function rowTop(row) {
  return BOARD.y + row * BOARD.cellH;
}

function getPlantDrawMetrics(plant) {
  if (plant.type === "sunflower") {
    return {
      width: BOARD.cellW * 0.88,
      height: BOARD.cellH * 0.82,
      baseYRatio: 0.83,
      shadowRatio: 0.26,
    };
  }
  if (plant.type === "peashooter") {
    return {
      width: BOARD.cellW * 0.86,
      height: BOARD.cellH * 0.79,
      baseYRatio: 0.83,
      shadowRatio: 0.25,
    };
  }
  if (plant.type === "wallnut") {
    return {
      width: BOARD.cellW * 0.78,
      height: BOARD.cellH * 0.8,
      baseYRatio: 0.84,
      shadowRatio: 0.29,
    };
  }
  if (plant.type === "potatomine") {
    return {
      width: BOARD.cellW * 0.9,
      height: BOARD.cellH * 0.58,
      baseYRatio: 0.86,
      shadowRatio: 0.24,
    };
  }
  if (plant.type === "cherrybomb") {
    return {
      width: BOARD.cellW * 1.18,
      height: BOARD.cellH * 0.9,
      baseYRatio: 0.84,
      shadowRatio: 0.3,
    };
  }
  return {
    width: BOARD.cellW * 0.86,
    height: BOARD.cellH * 0.8,
    baseYRatio: 0.83,
    shadowRatio: 0.26,
  };
}

function pickPlantImage(assets, plant) {
  const images = assets?.images;
  if (!images) return null;
  if (plant.type === "sunflower") return images.plantSunflower;
  if (plant.type === "peashooter") return images.plantPeashooter;
  if (plant.type === "wallnut") {
    const ratio = plant.maxHp > 0 ? plant.hp / plant.maxHp : 1;
    if (ratio <= 0.33) {
      return images.plantWallnutCracked2 || images.plantWallnutCracked1 || images.plantWallnut;
    }
    if (ratio <= 0.66) {
      return images.plantWallnutCracked1 || images.plantWallnut;
    }
    return images.plantWallnut;
  }
  if (plant.type === "cherrybomb") return images.plantCherrybomb;
  if (plant.type === "potatomine") {
    return plant.armed ? images.plantPotatomine : images.plantPotatomineUnarmed;
  }
  return null;
}

function pickZombieImage(assets, zombie) {
  const images = assets?.images;
  if (!images) return null;
  if (zombie.type === "normal") {
    if (zombie.eatingPlantId) return images.zNormalAttack;
    return images.zNormalWalk || images.zNormalWalkAlt;
  }
  if (zombie.type === "conehead") {
    return zombie.eatingPlantId ? images.zConeAttack : images.zConeWalk;
  }
  if (zombie.type === "flag") {
    if (zombie.eatingPlantId) {
      return images.zNormalAttack || images.zNormalWalk;
    }
    return images.zFlagWalk || images.zNormalWalk;
  }
  return images.zNormalWalk || images.zNormalWalkAlt;
}

function drawShadow(ctx, x, y, w, alpha = 0.28) {
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlant(ctx, plant, assets, timeMs) {
  const image = pickPlantImage(assets, plant);
  const metrics = getPlantDrawMetrics(plant);
  const sway = plant.type === "wallnut" ? 0 : Math.sin(timeMs * 0.0018 + plant.swayPhase) * 0.8;
  const floatY = plant.type === "wallnut" ? 0 : Math.cos(timeMs * 0.0015 + plant.swayPhase * 0.7) * 0.25;
  const width = metrics.width;
  const height = metrics.height;
  const baseY = rowTop(plant.row) + BOARD.cellH * metrics.baseYRatio;
  const px = plant.x - width / 2 + sway;
  const py = baseY - height + floatY;
  drawShadow(ctx, plant.x + sway * 0.25, baseY + 2, BOARD.cellW * metrics.shadowRatio);
  if (!drawImageSafe(ctx, image, px, py, width, height)) {
    ctx.fillStyle = "#5ab043";
    ctx.beginPath();
    ctx.arc(plant.x, plant.y, 18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawZombie(ctx, zombie, assets, timeMs) {
  const laneTop = rowTop(zombie.row);
  const yCenter = laneTop + BOARD.cellH / 2;
  const image = pickZombieImage(assets, zombie);
  const width = BOARD.cellW * 1.98;
  const height = BOARD.cellH * 1.565;
  const walkBob = 0;
  const biteNudge = zombie.eatingPlantId ? -2.4 : 0;
  const footY = laneTop + BOARD.cellH * 0.78;
  const px = zombie.x - width * 0.63 + biteNudge;
  const py = footY - height + walkBob;
  const shadowW = BOARD.cellW * (zombie.eatingPlantId ? 0.36 : 0.32);
  drawShadow(ctx, zombie.x - BOARD.cellW * 0.22, footY + 3, shadowW, 0.3);
  if (!drawImageSafe(ctx, image, px, py, width, height)) {
    ctx.fillStyle = "#7d8f7d";
    ctx.fillRect(zombie.x - 18, yCenter - 34, 36, 62);
  }
}

function drawProjectile(ctx, shot, assets) {
  const img = assets?.images?.pea;
  drawShadow(ctx, shot.x - 2, shot.y + 12, 8.4, 0.2);
  if (!drawImageSafe(ctx, img, shot.x - 13, shot.y - 13, 26, 26)) {
    ctx.fillStyle = "#65d846";
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, 8.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSunToken(ctx, token, assets, timeMs) {
  const img = assets?.images?.sun;
  const pulse = 1 + Math.sin(timeMs * 0.01 + token.driftPhase) * 0.05;
  const size = 78 * pulse;
  if (!drawImageSafe(ctx, img, token.x - size / 2, token.y - size / 2, size, size)) {
    ctx.fillStyle = "#ffdc3f";
    ctx.beginPath();
    ctx.arc(token.x, token.y, 24, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMowers(ctx, mowers, assets) {
  const mowerImg = assets?.images?.mower;
  mowers.forEach((mower) => {
    if (!mower.active && !mower.moving) return;
    const y = BOARD.y + mower.row * BOARD.cellH + BOARD.cellH / 2;
    const width = BOARD.cellW * 0.74;
    const height = BOARD.cellH * 0.55;
    const hasImage = drawImageSafe(ctx, mowerImg, mower.x - width * 0.45, y - height * 0.56, width, height);
    if (!hasImage) {
      ctx.fillStyle = mower.active ? "#d04032" : "#ff8d2c";
      ctx.fillRect(mower.x - 18, y - 16, 44, 32);
    }
  });
}

function drawEffects(ctx, effects) {
  effects.forEach((fx) => {
    const p = 1 - fx.ttlMs / fx.maxTtlMs;
    if (fx.type === "muzzle") {
      ctx.save();
      ctx.globalAlpha = 1 - p;
      ctx.fillStyle = "#f7f49f";
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 3 + p * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (fx.type === "pea-hit") {
      ctx.save();
      ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = "#9cf770";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, 4 + p * 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (fx.type === "bite") {
      ctx.save();
      ctx.globalAlpha = 0.55 * (1 - p);
      ctx.strokeStyle = "#8f4f2d";
      ctx.lineWidth = 2.2;
      const r = 4 + p * 8;
      ctx.beginPath();
      ctx.moveTo(fx.x - r, fx.y - r * 0.4);
      ctx.lineTo(fx.x - 1, fx.y);
      ctx.lineTo(fx.x - r, fx.y + r * 0.4);
      ctx.moveTo(fx.x + r, fx.y - r * 0.4);
      ctx.lineTo(fx.x + 1, fx.y);
      ctx.lineTo(fx.x + r, fx.y + r * 0.4);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (fx.type === "explosion") {
      ctx.save();
      ctx.globalAlpha = 1 - p;
      const radius = 18 + p * 80;
      const grad = ctx.createRadialGradient(fx.x, fx.y, 6, fx.x, fx.y, radius);
      grad.addColorStop(0, "rgba(255, 244, 180, 0.95)");
      grad.addColorStop(0.35, "rgba(255, 175, 40, 0.75)");
      grad.addColorStop(1, "rgba(220, 56, 34, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (fx.type === "zombie-death") {
      ctx.save();
      ctx.globalAlpha = 0.4 * (1 - p);
      ctx.fillStyle = "#c9c9c9";
      ctx.beginPath();
      ctx.arc(fx.x, fx.y - p * 12, 8 + p * 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
  });
}

function drawHoverPreview(ctx, state, assets) {
  if (state.scene !== SCENES.playing) return;
  const hover = state.hoverCell;
  if (!hover) return;
  const x = BOARD.x + hover.col * BOARD.cellW;
  const y = BOARD.y + hover.row * BOARD.cellH;
  ctx.save();
  if (!state.shovelMode && state.selectedCardId) {
    const previewPlant = { type: state.selectedCardId, armed: true };
    const img = pickPlantImage(assets, previewPlant);
    const metrics = getPlantDrawMetrics(previewPlant);
    const width = metrics.width;
    const height = metrics.height;
    const centerX = x + BOARD.cellW * 0.5;
    const laneTop = rowTop(hover.row);
    const baseY = laneTop + BOARD.cellH * metrics.baseYRatio;
    const px = centerX - width / 2;
    const py = baseY - height;

    ctx.fillStyle = hover.valid ? "rgba(149, 231, 116, 0.2)" : "rgba(227, 96, 78, 0.2)";
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      laneTop + BOARD.cellH * 0.78,
      BOARD.cellW * 0.46,
      BOARD.cellH * 0.24,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    drawShadow(
      ctx,
      centerX,
      baseY + 2,
      BOARD.cellW * metrics.shadowRatio,
      hover.valid ? 0.28 : 0.2
    );
    ctx.globalAlpha = hover.valid ? 0.76 : 0.42;
    if (!drawImageSafe(ctx, img, px, py, width, height)) {
      ctx.fillStyle = "#73bc54";
      ctx.beginPath();
      ctx.arc(x + BOARD.cellW * 0.5, y + BOARD.cellH * 0.5, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawFooter(ctx, state) {
  ctx.fillStyle = "rgba(12, 20, 10, 0.62)";
  ctx.fillRect(16, CANVAS.height - 46, CANVAS.width - 32, 32);
  const done = state.waves.cursor;
  const total = state.waves.total;
  ctx.fillStyle = "#fff1c8";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText(
    `Waves ${done}/${total} | Zombies ${state.zombies.length} | ${state.hudMessage}`,
    26,
    CANVAS.height - 24
  );
}

export function renderFrame(ctx, state, assets, options = {}) {
  const shakeX = state.cameraShakeMs > 0 ? (Math.random() - 0.5) * 6 : 0;
  const shakeY = state.cameraShakeMs > 0 ? (Math.random() - 0.5) * 6 : 0;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);
  ctx.translate(shakeX, shakeY);
  drawBackground(ctx, assets);
  drawLawnPlayableMask(ctx);
  drawMowers(ctx, state.mowers, assets);
  if (options.drawPlants !== false) {
    state.plants.forEach((plant) => drawPlant(ctx, plant, assets, state.timeMs));
  }
  if (options.drawZombies !== false) {
    state.zombies.forEach((zombie) => drawZombie(ctx, zombie, assets, state.timeMs));
  }
  state.projectiles.forEach((shot) => drawProjectile(ctx, shot, assets));
  state.sunTokens.forEach((token) => drawSunToken(ctx, token, assets, state.timeMs));
  drawEffects(ctx, state.effects || []);
  drawHoverPreview(ctx, state, assets);
  drawFooter(ctx, state);
  ctx.restore();
}
