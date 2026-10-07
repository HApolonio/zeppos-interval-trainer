import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, LEAD_IN_SECONDS } from "../lib/interval-engine.js";
import {
  summarizeRun,
  formatReport,
  formatDuration,
  compressRanges,
  entryLines,
  runEvents,
  MISSING_AFTER_MS,
} from "../lib/spike-report.js";

const ORIGIN = 1_790_000_006_000;
const plannedMs = (atSec) => ORIGIN + atSec * 1000;

function makeRun(overrides = {}) {
  return {
    runId: "r1",
    originMs: ORIGIN,
    config: DEFAULT_CONFIG,
    leadInSec: LEAD_IN_SECONDS,
    cancelledAtMs: null,
    ...overrides,
  };
}

const makeLog = (entries) => ({ runId: "r1", lastEventIndex: -1, entries });

describe("runEvents", () => {
  test("includes the lead-in", () => {
    const events = runEvents(makeRun());
    assert.equal(events.length, 60);
    assert.equal(events[0].atSec, -5);
    assert.equal(runEvents(makeRun({ leadInSec: undefined })).length, 54);
  });
});

describe("summarizeRun", () => {
  test("no run gives no summary", () => {
    assert.equal(summarizeRun(null, null, ORIGIN), null);
  });

  test("before the first lead-in event the run is starting", () => {
    const s = summarizeRun(makeRun(), makeLog([]), plannedMs(-6));
    assert.equal(s.state, "starting");
    assert.equal(s.planned, 60);
    assert.equal(s.pending, 60);
    assert.equal(s.missing, 0);
    assert.equal(s.minLateMs, null);
  });

  test("lateness, duplicates, alerts and sounds", () => {
    const entries = [
      { i: 0, firedMs: plannedMs(-5) + 5, emitted: 0 },
      { i: 2, firedMs: plannedMs(-3) + 9, emitted: 2, sound: true },
      { i: 2, firedMs: plannedMs(-3) + 400 },
      { i: 5, firedMs: plannedMs(0) + 18, emitted: 5 },
    ];
    const s = summarizeRun(makeRun(), makeLog(entries), plannedMs(1));
    assert.equal(s.state, "running");
    assert.equal(s.fired, 3);
    assert.equal(s.duplicates, 1);
    assert.equal(s.alerts, 3);
    assert.equal(s.sounds, 1);
    assert.equal(s.minLateMs, 5);
    assert.equal(s.maxLateMs, 18);
    assert.equal(s.avgLateMs, Math.round((5 + 9 + 18) / 3));
    assert.equal(s.firstLateMs, 5);
    assert.equal(s.lastLateMs, 18);
    assert.deepEqual(s.firedIndexes, [0, 2, 5]);
  });

  test("a skipped event counts as missing only after the margin", () => {
    const entries = [{ i: 0, firedMs: plannedMs(-5), emitted: 0 }];
    assert.equal(summarizeRun(makeRun(), makeLog(entries), plannedMs(-4) + MISSING_AFTER_MS).missing, 0);
    assert.equal(summarizeRun(makeRun(), makeLog(entries), plannedMs(-4) + MISSING_AFTER_MS + 1).missing, 1);
  });

  test("errors are counted and invalid indexes ignored", () => {
    const entries = [
      { i: 3, firedMs: plannedMs(-2), emitted: 3, err: "Player" },
      { i: 99, firedMs: plannedMs(-1) },
    ];
    const s = summarizeRun(makeRun(), makeLog(entries), plannedMs(0));
    assert.equal(s.errors, 1);
    assert.equal(s.fired, 1);
  });

  test("states: stopped and done", () => {
    assert.equal(summarizeRun(makeRun({ cancelledAtMs: ORIGIN }), makeLog([]), plannedMs(10)).state, "stopped");
    assert.equal(summarizeRun(makeRun(), makeLog([]), plannedMs(366)).state, "done");
  });

  test("a log from another run is ignored", () => {
    const log = { runId: "old", lastEventIndex: 3, entries: [{ i: 0, firedMs: plannedMs(-5) }] };
    assert.equal(summarizeRun(makeRun(), log, plannedMs(0)).fired, 0);
  });
});

describe("formatReport", () => {
  test("idle shows the session length", () => {
    const { title, body } = formatReport(null, { infoLines: ["Vol 61"] });
    assert.equal(title, "IDLE");
    assert.match(body, /Start: 6:00 session/);
    assert.match(body, /Vol 61/);
  });

  test("summary lines stay short enough for the scrolling report", () => {
    const s = summarizeRun(makeRun(), makeLog([]), plannedMs(400));
    const { title, body } = formatReport(
      {
        ...s,
        firedIndexes: [0, 1, 2, 3, 4, 10, 12, 13],
        minLateMs: -1000,
        avgLateMs: 1999,
        maxLateMs: 99999,
        firstLateMs: -1000,
        lastLateMs: 99999,
      },
      { infoLines: ["Vol 61", "Keep on 0/0 377s"], entries: ["#0 w @-5.0s +5 V"] },
    );
    assert.equal(title, "DONE");
    assert.match(body, /Idx 0-4,10,12-13/);
    assert.match(body, /Keep on 0\/0 377s/);
    assert.match(body, /#0 w @-5\.0s \+5 V/);
    for (const line of body.split("\n")) assert.ok(line.length <= 26, line);
  });
});

describe("helpers", () => {
  test("formatDuration", () => {
    assert.equal(formatDuration(360), "6:00");
    assert.equal(formatDuration(65), "1:05");
  });

  test("compressRanges collapses consecutive indexes", () => {
    assert.equal(compressRanges([]), "-");
    assert.equal(compressRanges([3]), "3");
    assert.equal(compressRanges([0, 1, 2, 3, 4]), "0-4");
    assert.equal(compressRanges([0, 2, 3, 7]), "0,2-3,7");
  });

  test("entryLines shows kind, time, lateness and flags", () => {
    const entries = [
      { i: 2, firedMs: plannedMs(-3) + 9, emitted: 2, sound: true },
      { i: 5, firedMs: plannedMs(0) + 6, emitted: 5 },
      { i: 11, firedMs: plannedMs(60) + 7, emitted: 11, err: "x" },
    ];
    assert.deepEqual(entryLines(makeRun(), makeLog(entries)), [
      "#2 w @-3.0s +9 V SND",
      "#5 s @0.0s +6 V",
      "#11 t @60.0s +7 V ERR",
    ]);
    assert.deepEqual(entryLines(makeRun(), { runId: "old", lastEventIndex: -1, entries }), []);
  });
});
