function makeButton(text, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `ui-btn ${className}`.trim();
  button.textContent = text;
  return button;
}

export function createMenuUI(root, handlers) {
  const main = document.createElement("section");
  main.className = "overlay menu-screen";
  main.innerHTML = `
    <div class="panel menu-card">
      <h2 class="menu-title">植物大战僵尸 Web Demo</h2>
      <p class="muted">白天草地 1-1 | Vanilla + Canvas</p>
      <div class="menu-buttons"></div>
    </div>
  `;
  const mainButtons = main.querySelector(".menu-buttons");
  const startButton = makeButton("开始游戏");
  const continueButton = makeButton("继续游戏", "secondary");
  const settingsButton = makeButton("设置", "secondary");
  mainButtons.append(startButton, continueButton, settingsButton);

  const level = document.createElement("section");
  level.className = "overlay level-screen hidden";
  level.innerHTML = `
    <div class="panel level-card">
      <h2 class="panel-title">关卡选择</h2>
      <div class="lvl-row">
        <div>
          <strong>1-1 白天草地</strong>
          <div class="muted">10 波次 | 5x9 草坪</div>
        </div>
        <span class="tag" data-status>未通关</span>
      </div>
      <div class="row-actions"></div>
    </div>
  `;
  const levelActions = level.querySelector(".row-actions");
  const enterLevel = makeButton("进入 1-1");
  const backMainFromLevel = makeButton("返回菜单", "secondary");
  levelActions.append(enterLevel, backMainFromLevel);
  const levelStatus = level.querySelector("[data-status]");

  const settings = document.createElement("section");
  settings.className = "overlay settings-screen hidden";
  settings.innerHTML = `
    <div class="panel settings-card">
      <h2 class="panel-title">设置</h2>
      <div class="setting-row">
        <label for="volume-input">音量</label>
        <input id="volume-input" type="range" min="0" max="100" step="1" value="70" />
      </div>
      <div class="setting-row">
        <label for="lang-input">语言</label>
        <select id="lang-input">
          <option value="zh-CN">中文</option>
          <option value="en-US">English</option>
        </select>
      </div>
      <div class="setting-row">
        <label>
          <input id="mute-input" type="checkbox" />
          静音
        </label>
      </div>
      <div class="settings-actions"></div>
    </div>
  `;
  const settingsActions = settings.querySelector(".settings-actions");
  const saveSettingsButton = makeButton("保存设置");
  const backButton = makeButton("返回", "secondary");
  settingsActions.append(saveSettingsButton, backButton);
  const volumeInput = settings.querySelector("#volume-input");
  const langInput = settings.querySelector("#lang-input");
  const muteInput = settings.querySelector("#mute-input");

  root.append(main, level, settings);

  startButton.addEventListener("click", () => handlers.onStartNew());
  continueButton.addEventListener("click", () => handlers.onContinue());
  settingsButton.addEventListener("click", () => handlers.onOpenSettings());
  enterLevel.addEventListener("click", () => handlers.onEnterLevel());
  backMainFromLevel.addEventListener("click", () => handlers.onBackToMenu());
  backButton.addEventListener("click", () => handlers.onBackToMenu());
  saveSettingsButton.addEventListener("click", () => {
    handlers.onSaveSettings({
      volume: Number(volumeInput.value) / 100,
      language: langInput.value,
      muted: muteInput.checked,
    });
  });

  function hideAll() {
    main.classList.add("hidden");
    level.classList.add("hidden");
    settings.classList.add("hidden");
  }

  return {
    showMain({ canContinue }) {
      hideAll();
      main.classList.remove("hidden");
      continueButton.classList.toggle("hidden", !canContinue);
    },
    showLevel({ completed }) {
      hideAll();
      level.classList.remove("hidden");
      levelStatus.textContent = completed ? "已通关" : "未通关";
      levelStatus.style.background = completed ? "#3a8c43" : "#355f27";
    },
    showSettings(currentSettings) {
      hideAll();
      settings.classList.remove("hidden");
      volumeInput.value = `${Math.round((currentSettings.volume ?? 0.7) * 100)}`;
      langInput.value = currentSettings.language ?? "zh-CN";
      muteInput.checked = Boolean(currentSettings.muted);
    },
    hideAll,
  };
}
