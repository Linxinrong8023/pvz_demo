export function createResultUI(root, handlers, assetUrls = {}) {
  const result = document.createElement("section");
  result.className = "overlay result-screen hidden";
  result.innerHTML = `
    <div class="panel result-card">
      <img class="result-lose-art hidden" data-lose-art alt="Zombies Won" />
      <h2 class="panel-title" data-title>Battle Over</h2>
      <p class="muted" data-sub>Prepare for the next step.</p>
      <div class="row-actions">
        <button class="ui-btn" type="button" data-action="retry">Retry</button>
        <button class="ui-btn secondary" type="button" data-action="level">Back to Level</button>
      </div>
    </div>
  `;
  const title = result.querySelector("[data-title]");
  const sub = result.querySelector("[data-sub]");
  const loseArt = result.querySelector("[data-lose-art]");
  const retry = result.querySelector('[data-action="retry"]');
  const level = result.querySelector('[data-action="level"]');
  if (loseArt && assetUrls.zombiesWon) {
    loseArt.src = assetUrls.zombiesWon;
  }
  retry.addEventListener("click", handlers.onRetry);
  level.addEventListener("click", handlers.onBackToLevel);
  root.appendChild(result);

  return {
    show(outcome) {
      result.classList.remove("hidden");
      if (outcome === "win") {
        loseArt?.classList.add("hidden");
        title.textContent = "Victory";
        sub.textContent = "You successfully defended the lawn.";
        retry.textContent = "Play Again";
      } else {
        loseArt?.classList.remove("hidden");
        title.textContent = "Defeat";
        sub.textContent = "Zombies ate your brains.";
        retry.textContent = "Retry Now";
      }
    },
    hide() {
      result.classList.add("hidden");
      loseArt?.classList.add("hidden");
    },
  };
}
