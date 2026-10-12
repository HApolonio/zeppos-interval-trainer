import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  alertPlan,
  parseSettings,
  serializeSettings,
  toggleSetting,
} from "../lib/settings.js";
import { buildEvents, buildTimeline, DEFAULT_CONFIG } from "../lib/interval-engine.js";

const events = buildEvents(buildTimeline(DEFAULT_CONFIG), 5);
const byKind = (kind, secondsLeft) => events.find((e) => e.kind === kind && e.secondsLeft === secondsLeft);

describe("parseSettings and serializeSettings", () => {
  test("round trip", () => {
    const settings = { sound: false, vibration: true, warnings: false };
    assert.deepEqual(parseSettings(serializeSettings(settings)), settings);
  });

  test("missing, corrupt or foreign data gives the defaults", () => {
    for (const bad of [null, undefined, "", "{", "[]", '{"schemaVersion":2,"settings":{"sound":false}}']) {
      assert.deepEqual(parseSettings(bad), DEFAULT_SETTINGS, String(bad));
    }
  });

  test("each key falls back on its own and unknown keys are dropped", () => {
    const text = JSON.stringify({ schemaVersion: 1, settings: { sound: false, vibration: "no", extra: 1 } });
    assert.deepEqual(parseSettings(text), { ...DEFAULT_SETTINGS, sound: false });
  });
});

describe("toggleSetting", () => {
  test("flips one key and leaves the input untouched", () => {
    const next = toggleSetting(DEFAULT_SETTINGS, "sound");
    assert.deepEqual(next, { ...DEFAULT_SETTINGS, sound: false });
    assert.equal(DEFAULT_SETTINGS.sound, true);
    assert.equal(toggleSetting(next, "sound").sound, true);
  });

  test("rejects unknown keys", () => {
    assert.throws(() => toggleSetting(DEFAULT_SETTINGS, "volume"), RangeError);
  });
});

describe("alertPlan", () => {
  test("defaults keep every alert, with sound only at 3 s left", () => {
    assert.deepEqual(alertPlan(DEFAULT_SETTINGS, byKind("warning", 5)), { vibrate: true, sound: false });
    assert.deepEqual(alertPlan(DEFAULT_SETTINGS, byKind("warning", 3)), { vibrate: true, sound: true });
    assert.deepEqual(alertPlan(DEFAULT_SETTINGS, byKind("transition")), { vibrate: true, sound: false });
    assert.deepEqual(alertPlan(DEFAULT_SETTINGS, byKind("start")), { vibrate: true, sound: false });
    assert.deepEqual(alertPlan(DEFAULT_SETTINGS, byKind("complete")), { vibrate: true, sound: false });
  });

  test("sound off keeps the vibration", () => {
    const settings = { ...DEFAULT_SETTINGS, sound: false };
    assert.deepEqual(alertPlan(settings, byKind("warning", 3)), { vibrate: true, sound: false });
  });

  test("vibration off keeps the sound and silences every pulse", () => {
    const settings = { ...DEFAULT_SETTINGS, vibration: false };
    assert.deepEqual(alertPlan(settings, byKind("warning", 3)), { vibrate: false, sound: true });
    assert.equal(alertPlan(settings, byKind("transition")).vibrate, false);
    assert.equal(alertPlan(settings, byKind("complete")).vibrate, false);
  });

  test("warnings off silences only the 5..1 pulses", () => {
    const settings = { ...DEFAULT_SETTINGS, warnings: false };
    for (let s = 5; s >= 1; s--) assert.equal(alertPlan(settings, byKind("warning", s)).vibrate, false);
    assert.equal(alertPlan(settings, byKind("warning", 3)).sound, true);
    for (const kind of ["start", "transition", "complete"]) {
      assert.equal(alertPlan(settings, byKind(kind)).vibrate, true, kind);
    }
  });

  test("everything off is silent", () => {
    const settings = { ...DEFAULT_SETTINGS, sound: false, vibration: false };
    for (const event of events) assert.deepEqual(alertPlan(settings, event), { vibrate: false, sound: false });
  });
});
