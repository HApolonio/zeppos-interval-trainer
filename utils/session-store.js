import { LocalStorage } from "@zos/storage";
import { parsePresets, serializePresets } from "../lib/presets.js";
import { parseSession, serializeSession } from "../lib/session-recovery.js";
import { parseSettings, serializeSettings } from "../lib/settings.js";

const PRESETS_KEY = "presets";
const SESSION_KEY = "session";
const SETTINGS_KEY = "settings";

// A LocalStorage instance caches the file in memory, so every access uses a fresh one.
export function loadPresets() {
  return parsePresets(new LocalStorage().getItem(PRESETS_KEY, null));
}

export function savePresets(presets) {
  new LocalStorage().setItem(PRESETS_KEY, serializePresets(presets));
}

export function loadSession() {
  return parseSession(new LocalStorage().getItem(SESSION_KEY, null));
}

export function saveSession(session) {
  new LocalStorage().setItem(SESSION_KEY, serializeSession(session));
}

export function clearSession() {
  new LocalStorage().removeItem(SESSION_KEY);
}

export function loadSettings() {
  return parseSettings(new LocalStorage().getItem(SETTINGS_KEY, null));
}

export function saveSettings(settings) {
  new LocalStorage().setItem(SETTINGS_KEY, serializeSettings(settings));
}
