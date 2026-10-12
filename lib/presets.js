// Pure preset logic: no @zos imports. Storage and the clock stay in the callers.
import { DEFAULT_CONFIG, LIMITS, validateConfig } from "./interval-engine.js";

export const PRESETS_SCHEMA_VERSION = 1;
export const MAX_PRESETS = 20;
export const DEFAULT_PRESET_ID = "classic";

const FIELDS = ["workSec", "restSec", "rounds"];

export function presetName(config) {
  return config.workSec + "/" + config.restSec + " x " + config.rounds;
}

// "m:ss", or "h:mm:ss" from one hour.
export function formatTotal(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + ss;
  return m + ":" + ss;
}

// "MM:SS" for the countdown; a phase is at most 60:00.
export function formatClock(sec) {
  return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
}

export function defaultPresets() {
  return [{ id: DEFAULT_PRESET_ID, config: { ...DEFAULT_CONFIG } }];
}

export function serializePresets(presets) {
  return JSON.stringify({ schemaVersion: PRESETS_SCHEMA_VERSION, presets });
}

// Unknown, corrupt or empty data falls back to the default list; invalid entries are dropped.
export function parsePresets(text) {
  let data = null;
  try {
    data = typeof text === "string" ? JSON.parse(text) : null;
  } catch (e) {
    data = null;
  }
  if (!data || data.schemaVersion !== PRESETS_SCHEMA_VERSION || !Array.isArray(data.presets)) {
    return defaultPresets();
  }
  const seen = new Set();
  const presets = [];
  for (const item of data.presets) {
    if (presets.length >= MAX_PRESETS) break;
    if (!item || typeof item.id !== "string" || item.id.length === 0 || seen.has(item.id)) continue;
    const result = validateConfig(item.config);
    if (!result.ok) continue;
    seen.add(item.id);
    presets.push({ id: item.id, config: result.config });
  }
  return presets.length > 0 ? presets : defaultPresets();
}

export function newPresetId(presets, nowMs) {
  const base = "p" + Math.floor(nowMs).toString(36);
  const taken = new Set(presets.map((p) => p.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = base + "-" + n;
  return id;
}

export function addPreset(presets, config, id) {
  if (presets.length >= MAX_PRESETS) return { ok: false, reason: "limit" };
  if (presets.some((p) => p.id === id)) return { ok: false, reason: "duplicate-id" };
  const result = validateConfig(config);
  if (!result.ok) return { ok: false, reason: "invalid" };
  return { ok: true, presets: presets.concat([{ id, config: result.config }]) };
}

export function updatePreset(presets, id, config) {
  if (!presets.some((p) => p.id === id)) return { ok: false, reason: "not-found" };
  const result = validateConfig(config);
  if (!result.ok) return { ok: false, reason: "invalid" };
  return { ok: true, presets: presets.map((p) => (p.id === id ? { id, config: result.config } : p)) };
}

// The list is never empty: deleting the last preset restores the default.
export function removePreset(presets, id) {
  const rest = presets.filter((p) => p.id !== id);
  return rest.length > 0 ? rest : defaultPresets();
}

export function findPreset(presets, id) {
  return presets.find((p) => p.id === id) || null;
}

// Seconds move in coarser steps as they grow; the result is always inside the limits.
function secondsStep(value) {
  if (value < 120) return 5;
  if (value < 600) return 15;
  return 60;
}

export function stepConfigValue(field, value, direction) {
  if (!FIELDS.includes(field)) throw new RangeError("Unknown config field: " + field);
  if (direction !== 1 && direction !== -1) throw new RangeError("direction must be 1 or -1");
  const { min, max } = LIMITS[field];
  let next;
  if (field === "rounds") {
    next = value + direction;
  } else {
    // Stepping down from a step boundary uses the finer step below it (120 -> 115).
    const step = direction === 1 ? secondsStep(value) : secondsStep(value - 1);
    next = direction === 1 ? (Math.floor(value / step) + 1) * step : (Math.ceil(value / step) - 1) * step;
  }
  return Math.min(max, Math.max(min, next));
}
