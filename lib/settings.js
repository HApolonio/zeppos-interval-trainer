// Pure settings logic: no @zos imports.

export const SETTINGS_SCHEMA_VERSION = 1;
// The countdown sound starts this many seconds before a change, so its last beep lands on it.
export const SOUND_AT_SECONDS_LEFT = 3;

export const DEFAULT_SETTINGS = Object.freeze({
  sound: true,
  vibration: true,
  warnings: true,
});

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

export function serializeSettings(settings) {
  return JSON.stringify({ schemaVersion: SETTINGS_SCHEMA_VERSION, settings });
}

// Missing, corrupt or foreign data gives the defaults; each key falls back on its own.
export function parseSettings(text) {
  let data = null;
  try {
    data = typeof text === "string" ? JSON.parse(text) : null;
  } catch (e) {
    data = null;
  }
  const stored =
    data && data.schemaVersion === SETTINGS_SCHEMA_VERSION && data.settings && typeof data.settings === "object"
      ? data.settings
      : {};
  const settings = {};
  for (const key of SETTING_KEYS) {
    settings[key] = typeof stored[key] === "boolean" ? stored[key] : DEFAULT_SETTINGS[key];
  }
  return settings;
}

export function toggleSetting(settings, key) {
  if (!SETTING_KEYS.includes(key)) throw new RangeError("Unknown setting: " + key);
  return { ...settings, [key]: !settings[key] };
}

// `warnings` only covers the 5..1 vibration pulses; start, transition and completion still vibrate.
export function alertPlan(settings, event) {
  const warning = event.kind === "warning";
  return {
    vibrate: settings.vibration && (!warning || settings.warnings),
    sound: settings.sound && warning && event.secondsLeft === SOUND_AT_SECONDS_LEFT,
  };
}
