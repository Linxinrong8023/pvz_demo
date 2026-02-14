export function createPauseUI(root, handlers) {
  const pause = document.createElement("section");
  pause.className = "overlay pause-screen hidden";
  pause.innerHTML = `
    <div class="panel pause-card">
      <h2 class="panel-title">已暂停</h2>
      <p class="muted">你可以继续、重开本关，或返回菜单。</p>
      <div class="row-actions">
        <button class="ui-btn" type="button" data-action="resume">继续</button>
        <button class="ui-btn secondary" type="button" data-action="restart">重开本关</button>
        <button class="ui-btn danger" type="button" data-action="menu">返回菜单</button>
      </div>
    </div>
  `;
  pause.querySelector('[data-action="resume"]').addEventListener("click", handlers.onResume);
  pause.querySelector('[data-action="restart"]').addEventListener("click", handlers.onRestart);
  pause.querySelector('[data-action="menu"]').addEventListener("click", handlers.onMenu);
  root.appendChild(pause);

  return {
    show() {
      pause.classList.remove("hidden");
    },
    hide() {
      pause.classList.add("hidden");
    },
  };
}
