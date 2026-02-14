function plantSpriteById(assetUrls, id) {
  if (!assetUrls?.plants) return "";
  if (id === "sunflower") return assetUrls.plants.sunflower;
  if (id === "peashooter") return assetUrls.plants.peashooter;
  if (id === "wallnut") return assetUrls.plants.wallnut;
  if (id === "cherrybomb") return assetUrls.plants.cherrybomb;
  if (id === "potatomine") return assetUrls.plants.potatomine;
  return "";
}

function makeCard(def, assetUrls) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "plant-card";
  card.dataset.cardId = def.id;
  const icon = plantSpriteById(assetUrls, def.id);
  if (assetUrls?.card) {
    card.style.backgroundImage = `url('${assetUrls.card}')`;
    card.style.backgroundSize = "cover";
    card.style.backgroundPosition = "center";
  }
  card.innerHTML = `
    <div class="name">${def.name}</div>
    <div class="cost">Sun ${def.cost}</div>
    ${icon ? `<img class="card-icon" alt="" src="${icon}" />` : ""}
    <div class="timer hidden">0.0s</div>
  `;
  return card;
}

export function createHudUI(root, handlers, plantDefs, assetUrls) {
  const hud = document.createElement("section");
  hud.className = "overlay hud hidden";
  hud.innerHTML = `
    <div class="panel sun-pill"><span>Sun</span><span data-sun>50</span></div>
    <div class="panel card-row" data-cards></div>
    <div class="hud-actions">
      <button class="ui-btn secondary" type="button" data-shovel>Shovel</button>
      <button class="ui-btn secondary" type="button" data-pause>Pause</button>
    </div>
  `;

  const sunEl = hud.querySelector("[data-sun]");
  const cardsWrap = hud.querySelector("[data-cards]");
  const shovelBtn = hud.querySelector("[data-shovel]");
  const pauseBtn = hud.querySelector("[data-pause]");
  const cardNodes = {};

  if (assetUrls?.shop) {
    cardsWrap.style.backgroundImage = `url('${assetUrls.shop}')`;
    cardsWrap.style.backgroundSize = "cover";
    cardsWrap.style.backgroundPosition = "center";
  }

  plantDefs.forEach((def) => {
    const card = makeCard(def, assetUrls);
    cardNodes[def.id] = card;
    cardsWrap.appendChild(card);
    card.addEventListener("click", () => handlers.onSelectCard(def.id));
  });

  if (assetUrls?.shovel) {
    shovelBtn.style.backgroundImage = `url('${assetUrls.shovel}')`;
    shovelBtn.style.backgroundRepeat = "no-repeat";
    shovelBtn.style.backgroundSize = "22px 22px";
    shovelBtn.style.backgroundPosition = "8px center";
    shovelBtn.style.paddingLeft = "34px";
  }

  shovelBtn.addEventListener("click", () => handlers.onToggleShovel());
  pauseBtn.addEventListener("click", () => handlers.onPause());

  root.append(hud);

  return {
    show() {
      hud.classList.remove("hidden");
    },
    hide() {
      hud.classList.add("hidden");
    },
    update(state) {
      sunEl.textContent = `${state.sun}`;
      Object.entries(cardNodes).forEach(([id, node]) => {
        const def = state.plantDefsById[id];
        const cooldownLeft = Math.max(0, (state.cardCooldownUntil[id] ?? 0) - state.frameNowMs);
        const affordable = state.sun >= def.cost;
        node.classList.toggle("active", state.selectedCardId === id && !state.shovelMode);
        node.classList.toggle("cooldown", cooldownLeft > 0 || !affordable);
        node.style.opacity = affordable ? "1" : "0.65";
        const timer = node.querySelector(".timer");
        if (cooldownLeft > 0) {
          timer.classList.remove("hidden");
          timer.textContent = `${(cooldownLeft / 1000).toFixed(1)}s`;
        } else {
          timer.classList.add("hidden");
        }
      });

      shovelBtn.classList.toggle("danger", state.shovelMode);
      shovelBtn.textContent = state.shovelMode ? "Shovel ON" : "Shovel";
    },
  };
}
