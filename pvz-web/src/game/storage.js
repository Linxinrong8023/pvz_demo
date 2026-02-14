import { STORAGE_KEYS } from "./config.js";

/**
 * @typedef {Object} ProgressState
 * @property {Record<string, boolean>} completedLevels
 * @property {string|null} lastLevelId
 */

/**
 * @typedef {Object} SettingsState
 * @property {number} volume
 * @property {string} language
 * @property {boolean} muted
 */

export function defaultProgress() {
  return {
    completedLevels: {},
    lastLevelId: null,
  };
}

export function defaultSettings() {
  return {
    volume: 0.7,
    language: "zh-CN",
    muted: false,
  };
}

/**
 * @returns {ProgressState}
 */
export function loadProgress() {
  const fallback = defaultProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.progress);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      completedLevels:
        parsed && typeof parsed === "object" && parsed.completedLevels
          ? parsed.completedLevels
          : {},
      lastLevelId:
        parsed && typeof parsed.lastLevelId === "string" ? parsed.lastLevelId : null,
    };
  } catch {
    return fallback;
  }
}

/**
 * @param {ProgressState} progress
 */
export function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress));
  } catch {
    // no-op
  }
}

/**
 * @returns {SettingsState}
 */
export function loadSettings() {
  const fallback = defaultSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed?.volume === "number" ? Math.max(0, Math.min(1, parsed.volume)) : 0.7,
      language: typeof parsed?.language === "string" ? parsed.language : "zh-CN",
      muted: Boolean(parsed?.muted),
    };
  } catch {
    return fallback;
  }
}

/**
 * @param {SettingsState} settings
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  } catch {
    // no-op
  }
}
