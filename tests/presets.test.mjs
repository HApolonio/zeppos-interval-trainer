import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, LIMITS } from "../lib/interval-engine.js";
import {
  DEFAULT_PRESET_ID,
  MAX_PRESETS,
  addPreset,
  defaultPresets,
  findPreset,
  formatClock,
  formatTotal,
  newPresetId,
  parsePresets,
  presetName,
  removePreset,
  serializePresets,
  stepConfigValue,
  updatePreset,
} from "../lib/presets.js";

const cfg = (workSec, restSec, rounds) => ({ workSec, restSec, rounds });

describe("formatting", () => {
  test("presetName shows work/rest x rounds", () => {
    assert.equal(presetName(DEFAULT_CONFIG), "60/15 x 5");
  });

  test("formatTotal uses m:ss and h:mm:ss", () => {
    assert.equal(formatTotal(360), "6:00");
    assert.equal(formatTotal(45), "0:45");
    assert.equal(formatTotal(3599), "59:59");
    assert.equal(formatTotal(3600), "1:00:00");
    assert.equal(formatTotal(197 * 3600), "197:00:00");
  });

  test("formatClock pads minutes and seconds", () => {
    assert.equal(formatClock(0), "00:00");
    assert.equal(formatClock(5), "00:05");
    assert.equal(formatClock(60), "01:00");
    assert.equal(formatClock(3600), "60:00");
  });
});

describe("parsePresets and serializePresets", () => {
  test("round trip keeps ids and configs", () => {
    const presets = [
      { id: "a", config: cfg(30, 10, 8) },
      { id: "b", config: cfg(60, 15, 5) },
    ];
    assert.deepEqual(parsePresets(serializePresets(presets)), presets);
  });

  test("missing, corrupt or foreign data gives the default list", () => {
    for (const bad of [null, undefined, "", "{", "[]", '{"schemaVersion":2,"presets":[]}', '{"schemaVersion":1}']) {
      assert.deepEqual(parsePresets(bad), defaultPresets(), String(bad));
    }
  });

  test("drops invalid configs, bad ids and duplicates", () => {
    const text = JSON.stringify({
      schemaVersion: 1,
      presets: [
        { id: "ok", config: cfg(20, 10, 3) },
        { id: "ok", config: cfg(30, 10, 3) },
        { id: "", config: cfg(30, 10, 3) },
        { id: "low", config: cfg(5, 10, 3) },
        null,
        { id: "x" },
        { id: "clean", config: { ...cfg(40, 20, 2), extra: 1 } },
      ],
    });
    assert.deepEqual(parsePresets(text), [
      { id: "ok", config: cfg(20, 10, 3) },
      { id: "clean", config: cfg(40, 20, 2) },
    ]);
  });

  test("an all-invalid list falls back to the default", () => {
    const text = JSON.stringify({ schemaVersion: 1, presets: [{ id: "a", config: cfg(1, 1, 1) }] });
    assert.deepEqual(parsePresets(text), defaultPresets());
  });

  test("keeps at most MAX_PRESETS", () => {
    const presets = Array.from({ length: MAX_PRESETS + 5 }, (_, i) => ({ id: "p" + i, config: cfg(20, 10, 2) }));
    assert.equal(parsePresets(serializePresets(presets)).length, MAX_PRESETS);
  });
});

describe("preset list operations", () => {
  test("addPreset appends a validated copy", () => {
    const result = addPreset(defaultPresets(), { ...cfg(30, 10, 4), extra: 1 }, "n1");
    assert.equal(result.ok, true);
    assert.deepEqual(result.presets.at(-1), { id: "n1", config: cfg(30, 10, 4) });
    assert.equal(result.presets.length, 2);
  });

  test("addPreset rejects invalid config, duplicate id and a full list", () => {
    assert.deepEqual(addPreset(defaultPresets(), cfg(5, 10, 4), "n1"), { ok: false, reason: "invalid" });
    assert.deepEqual(addPreset(defaultPresets(), cfg(30, 10, 4), DEFAULT_PRESET_ID), {
      ok: false,
      reason: "duplicate-id",
    });
    const full = Array.from({ length: MAX_PRESETS }, (_, i) => ({ id: "p" + i, config: cfg(20, 10, 2) }));
    assert.deepEqual(addPreset(full, cfg(30, 10, 4), "new"), { ok: false, reason: "limit" });
  });

  test("updatePreset replaces one entry", () => {
    const presets = [
      { id: "a", config: cfg(20, 10, 2) },
      { id: "b", config: cfg(30, 10, 3) },
    ];
    const result = updatePreset(presets, "b", cfg(45, 15, 6));
    assert.equal(result.ok, true);
    assert.deepEqual(result.presets, [presets[0], { id: "b", config: cfg(45, 15, 6) }]);
    assert.deepEqual(updatePreset(presets, "zzz", cfg(45, 15, 6)), { ok: false, reason: "not-found" });
    assert.deepEqual(updatePreset(presets, "b", cfg(1, 15, 6)), { ok: false, reason: "invalid" });
  });

  test("removePreset never leaves the list empty", () => {
    const presets = [
      { id: "a", config: cfg(20, 10, 2) },
      { id: "b", config: cfg(30, 10, 3) },
    ];
    assert.deepEqual(removePreset(presets, "a"), [presets[1]]);
    assert.deepEqual(removePreset([presets[0]], "a"), defaultPresets());
    assert.deepEqual(removePreset(presets, "zzz"), presets);
  });

  test("findPreset returns the preset or null", () => {
    const presets = defaultPresets();
    assert.equal(findPreset(presets, DEFAULT_PRESET_ID), presets[0]);
    assert.equal(findPreset(presets, "nope"), null);
  });

  test("newPresetId is unique within the list", () => {
    const first = newPresetId([], 1_790_000_000_000);
    assert.match(first, /^p[0-9a-z]+$/);
    const second = newPresetId([{ id: first, config: DEFAULT_CONFIG }], 1_790_000_000_000);
    assert.notEqual(second, first);
  });
});

describe("stepConfigValue", () => {
  test("rounds step by one inside the limits", () => {
    assert.equal(stepConfigValue("rounds", 5, 1), 6);
    assert.equal(stepConfigValue("rounds", 5, -1), 4);
    assert.equal(stepConfigValue("rounds", LIMITS.rounds.min, -1), LIMITS.rounds.min);
    assert.equal(stepConfigValue("rounds", LIMITS.rounds.max, 1), LIMITS.rounds.max);
  });

  test("seconds snap to 5 below 2:00", () => {
    assert.equal(stepConfigValue("workSec", 60, 1), 65);
    assert.equal(stepConfigValue("workSec", 60, -1), 55);
    assert.equal(stepConfigValue("workSec", 62, 1), 65);
    assert.equal(stepConfigValue("workSec", 62, -1), 60);
    assert.equal(stepConfigValue("restSec", 6, 1), 10);
    assert.equal(stepConfigValue("restSec", 10, -1), 6);
    assert.equal(stepConfigValue("restSec", 6, -1), 6);
  });

  test("seconds step by 15 from 2:00 and by 60 from 10:00", () => {
    assert.equal(stepConfigValue("workSec", 115, 1), 120);
    assert.equal(stepConfigValue("workSec", 120, 1), 135);
    assert.equal(stepConfigValue("workSec", 120, -1), 115);
    assert.equal(stepConfigValue("workSec", 125, -1), 120);
    assert.equal(stepConfigValue("workSec", 585, 1), 600);
    assert.equal(stepConfigValue("workSec", 600, 1), 660);
    assert.equal(stepConfigValue("workSec", 600, -1), 585);
    assert.equal(stepConfigValue("workSec", 660, -1), 600);
  });

  test("seconds stay inside the limits", () => {
    assert.equal(stepConfigValue("workSec", 3595, 1), 3600);
    assert.equal(stepConfigValue("workSec", 3600, 1), 3600);
  });

  test("every step from every value stays valid and moves in the requested direction", () => {
    for (const field of ["workSec", "restSec"]) {
      const { min, max } = LIMITS[field];
      for (let v = min; v <= max; v++) {
        const up = stepConfigValue(field, v, 1);
        const down = stepConfigValue(field, v, -1);
        assert.ok(up >= min && up <= max && down >= min && down <= max);
        assert.ok(v === max ? up === max : up > v, `${field} up from ${v}`);
        assert.ok(v === min ? down === min : down < v, `${field} down from ${v}`);
      }
    }
  });

  test("rejects unknown fields and directions", () => {
    assert.throws(() => stepConfigValue("nope", 5, 1), RangeError);
    assert.throws(() => stepConfigValue("rounds", 5, 0), RangeError);
  });
});
