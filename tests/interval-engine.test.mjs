import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CONFIG,
  LIMITS,
  SCHEMA_VERSION,
  validateConfig,
  totalSeconds,
  buildTimeline,
  buildEvents,
  getPosition,
  createSession,
  elapsedMs,
  pauseSession,
  resumeSession,
  stopSession,
  completeSession,
  interruptSession,
  reconcile,
  pendingEvents,
  eventTimeSec,
  LEAD_IN_SECONDS,
} from "../lib/interval-engine.js";

const T0 = 1_790_000_000_000; // whole second
const defaultTimeline = () => buildTimeline(DEFAULT_CONFIG);
const defaultEvents = () => buildEvents(defaultTimeline());
const newSession = (config = DEFAULT_CONFIG, startMs = T0) =>
  createSession({ id: "s1", config, startMs });

describe("validateConfig", () => {
  test("accepts the default config and returns a clean copy", () => {
    const result = validateConfig({ ...DEFAULT_CONFIG, extra: 1 });
    assert.deepEqual(result, { ok: true, config: { workSec: 60, restSec: 15, rounds: 5 } });
  });

  test("accepts every boundary value", () => {
    for (const [field, { min, max }] of Object.entries(LIMITS)) {
      assert.equal(validateConfig({ ...DEFAULT_CONFIG, [field]: min }).ok, true, `${field} min`);
      assert.equal(validateConfig({ ...DEFAULT_CONFIG, [field]: max }).ok, true, `${field} max`);
    }
  });

  test("rejects values just outside the limits", () => {
    for (const [field, { min, max }] of Object.entries(LIMITS)) {
      assert.deepEqual(validateConfig({ ...DEFAULT_CONFIG, [field]: min - 1 }).errors, [
        { field, reason: "below-min" },
      ]);
      assert.deepEqual(validateConfig({ ...DEFAULT_CONFIG, [field]: max + 1 }).errors, [
        { field, reason: "above-max" },
      ]);
    }
  });

  test("rejects non-integer values", () => {
    for (const bad of [6.5, "60", NaN, Infinity, null, undefined]) {
      const result = validateConfig({ ...DEFAULT_CONFIG, workSec: bad });
      assert.deepEqual(result.errors, [{ field: "workSec", reason: "not-integer" }], String(bad));
    }
  });

  test("reports every invalid field", () => {
    const result = validateConfig({ workSec: 5, restSec: 3601, rounds: 0 });
    assert.equal(result.ok, false);
    assert.deepEqual(
      result.errors.map((e) => e.field),
      ["workSec", "restSec", "rounds"],
    );
  });

  test("rejects non-objects", () => {
    assert.equal(validateConfig(null).ok, false);
    assert.equal(validateConfig(60).ok, false);
  });
});

describe("totalSeconds", () => {
  test("default session is 6:00", () => {
    assert.equal(totalSeconds(DEFAULT_CONFIG), 360);
  });

  test("one round has no rest", () => {
    assert.equal(totalSeconds({ workSec: 45, restSec: 30, rounds: 1 }), 45);
  });

  test("maximum config", () => {
    assert.equal(totalSeconds({ workSec: 3600, restSec: 3600, rounds: 99 }), 197 * 3600);
  });

  test("throws on invalid config", () => {
    assert.throws(() => totalSeconds({ workSec: 5, restSec: 15, rounds: 5 }), RangeError);
  });
});

describe("buildTimeline", () => {
  test("default session has 9 contiguous phases ending at 360 s", () => {
    const timeline = defaultTimeline();
    assert.equal(timeline.length, 9);
    assert.deepEqual(timeline[0], { type: "work", round: 1, startSec: 0, endSec: 60 });
    assert.deepEqual(timeline[1], { type: "rest", round: 1, startSec: 60, endSec: 75 });
    assert.deepEqual(timeline[8], { type: "work", round: 5, startSec: 300, endSec: 360 });
    for (let i = 1; i < timeline.length; i++) {
      assert.equal(timeline[i].startSec, timeline[i - 1].endSec);
    }
  });

  test("one-round session is a single work phase", () => {
    assert.deepEqual(buildTimeline({ workSec: 20, restSec: 10, rounds: 1 }), [
      { type: "work", round: 1, startSec: 0, endSec: 20 },
    ]);
  });
});

describe("buildEvents", () => {
  test("default session has 54 events with sequential indexes and increasing times", () => {
    const events = defaultEvents();
    assert.equal(events.length, 54);
    events.forEach((event, i) => {
      assert.equal(event.index, i);
      if (i > 0) assert.ok(event.atSec > events[i - 1].atSec);
    });
  });

  test("warnings at 5..1 s then a transition at the phase end", () => {
    const events = defaultEvents();
    assert.deepEqual(
      events.slice(0, 6).map((e) => [e.atSec, e.kind, e.secondsLeft]),
      [
        [55, "warning", 5],
        [56, "warning", 4],
        [57, "warning", 3],
        [58, "warning", 2],
        [59, "warning", 1],
        [60, "transition", undefined],
      ],
    );
    assert.ok(events.slice(0, 6).every((e) => e.phaseIndex === 0));
  });

  test("the last phase ends with a completion event", () => {
    const events = defaultEvents();
    assert.deepEqual(events.at(-1), { index: 53, atSec: 360, kind: "complete", phaseIndex: 8 });
    assert.equal(events.filter((e) => e.kind === "complete").length, 1);
    assert.equal(events.filter((e) => e.kind === "transition").length, 8);
  });

  test("one-round session has 5 warnings and a completion", () => {
    const events = buildEvents(buildTimeline({ workSec: 6, restSec: 6, rounds: 1 }));
    assert.deepEqual(
      events.map((e) => [e.atSec, e.kind]),
      [
        [1, "warning"],
        [2, "warning"],
        [3, "warning"],
        [4, "warning"],
        [5, "warning"],
        [6, "complete"],
      ],
    );
  });

  test("minimum phases never produce overlapping events", () => {
    const events = buildEvents(buildTimeline({ workSec: 6, restSec: 6, rounds: 3 }));
    assert.equal(events.length, 30);
    for (let i = 1; i < events.length; i++) assert.equal(events[i].atSec, events[i - 1].atSec + 1);
  });
});

describe("getPosition", () => {
  const timeline = defaultTimeline();

  test("first millisecond of the session", () => {
    const p = getPosition(timeline, 0);
    assert.equal(p.state, "active");
    assert.equal(p.phaseIndex, 0);
    assert.equal(p.phaseElapsedMs, 0);
    assert.equal(p.remainingMs, 60_000);
    assert.equal(p.displaySec, 60);
    assert.equal(p.inWarning, false);
    assert.equal(p.totalRemainingMs, 360_000);
  });

  test("last millisecond of a phase and first of the next", () => {
    const last = getPosition(timeline, 59_999);
    assert.equal(last.phaseIndex, 0);
    assert.equal(last.remainingMs, 1);
    assert.equal(last.displaySec, 1);
    assert.equal(last.inWarning, true);

    const next = getPosition(timeline, 60_000);
    assert.equal(next.phaseIndex, 1);
    assert.equal(next.phase.type, "rest");
    assert.equal(next.phaseElapsedMs, 0);
    assert.equal(next.remainingMs, 15_000);
    assert.equal(next.inWarning, false);
  });

  test("warning window starts exactly at 5 s remaining", () => {
    const before = getPosition(timeline, 54_999);
    assert.equal(before.displaySec, 6);
    assert.equal(before.inWarning, false);

    const start = getPosition(timeline, 55_000);
    assert.equal(start.displaySec, 5);
    assert.equal(start.inWarning, true);
  });

  test("before second 0 the session is waiting on the first phase", () => {
    const p = getPosition(timeline, -1_500);
    assert.equal(p.state, "waiting");
    assert.equal(p.phaseIndex, 0);
    assert.equal(p.remainingMs, 60_000);
    assert.equal(p.inWarning, false);
  });

  test("last millisecond of the session and the end", () => {
    const last = getPosition(timeline, 359_999);
    assert.equal(last.state, "active");
    assert.equal(last.phaseIndex, 8);
    assert.equal(last.displaySec, 1);

    for (const at of [360_000, 999_999]) {
      const done = getPosition(timeline, at);
      assert.equal(done.state, "done");
      assert.equal(done.phaseIndex, 8);
      assert.equal(done.remainingMs, 0);
      assert.equal(done.displaySec, 0);
      assert.equal(done.totalRemainingMs, 0);
    }
  });
});

describe("sessions", () => {
  test("createSession snapshots the config and aligns origin to a whole second", () => {
    const config = { ...DEFAULT_CONFIG };
    const session = createSession({ id: "abc", config, startMs: T0 + 3_200 });
    config.workSec = 999;
    assert.deepEqual(session, {
      schemaVersion: SCHEMA_VERSION,
      id: "abc",
      generation: 0,
      config: { workSec: 60, restSec: 15, rounds: 5 },
      status: "running",
      originMs: T0 + 4_000,
      pausedAtMs: null,
      lastEventIndex: -1,
    });
    assert.equal(createSession({ id: "a", config, startMs: T0 }).originMs, T0);
  });

  test("createSession rejects bad input", () => {
    assert.throws(() => createSession({ id: "", config: DEFAULT_CONFIG, startMs: T0 }), TypeError);
    assert.throws(() => createSession({ id: "a", config: DEFAULT_CONFIG, startMs: NaN }), TypeError);
    assert.throws(
      () => createSession({ id: "a", config: { ...DEFAULT_CONFIG, rounds: 0 }, startMs: T0 }),
      RangeError,
    );
  });

  test("elapsedMs follows the clock while running and freezes while paused", () => {
    const running = newSession();
    assert.equal(elapsedMs(running, T0 + 12_345), 12_345);

    const paused = pauseSession(running, T0 + 20_000);
    assert.equal(paused.status, "paused");
    assert.equal(paused.pausedAtMs, T0 + 20_000);
    assert.equal(paused.generation, 1);
    assert.equal(elapsedMs(paused, T0 + 500_000), 20_000);
  });

  test("state updates are immutable", () => {
    const running = newSession();
    const snapshot = structuredClone(running);
    pauseSession(running, T0 + 1_000);
    stopSession(running);
    assert.deepEqual(running, snapshot);
  });

  test("pause inside the warning window keeps the remaining time on resume", () => {
    const timeline = defaultTimeline();
    const paused = pauseSession(newSession(), T0 + 57_300);
    assert.equal(getPosition(timeline, elapsedMs(paused, T0 + 70_000)).remainingMs, 2_700);

    const resumed = resumeSession(paused, T0 + 57_300 + 10_000);
    assert.equal(resumed.status, "running");
    assert.equal(resumed.pausedAtMs, null);
    assert.equal(resumed.generation, 2);
    assert.equal(resumed.originMs, T0 + 10_000);
    const p = getPosition(timeline, elapsedMs(resumed, T0 + 67_300));
    assert.equal(p.phaseIndex, 0);
    assert.equal(p.remainingMs, 2_700);
    assert.equal(p.inWarning, true);
  });

  test("resume rounds the shift up: origin stays aligned, remaining never shrinks", () => {
    const timeline = defaultTimeline();
    const paused = pauseSession(newSession(), T0 + 57_300);
    for (const gap of [1, 400, 999, 1_000, 1_001, 10_400]) {
      const resumedAt = T0 + 57_300 + gap;
      const resumed = resumeSession(paused, resumedAt);
      assert.equal(resumed.originMs % 1000, 0, `gap ${gap}`);
      const remaining = getPosition(timeline, elapsedMs(resumed, resumedAt)).remainingMs;
      assert.ok(remaining >= 2_700 && remaining < 3_700, `gap ${gap}: ${remaining}`);
    }
  });

  test("resume shifts every later deadline", () => {
    const events = defaultEvents();
    const running = newSession();
    const resumed = resumeSession(pauseSession(running, T0 + 30_000), T0 + 90_000);
    assert.equal(eventTimeSec(resumed, events[0]) - eventTimeSec(running, events[0]), 60);
    assert.equal(eventTimeSec(resumed, events[53]) - eventTimeSec(running, events[53]), 60);
  });

  test("resume with the clock moved back interrupts the session", () => {
    const paused = pauseSession(newSession(), T0 + 30_000);
    const result = resumeSession(paused, T0 + 29_000);
    assert.equal(result.status, "interrupted");
    assert.equal(result.generation, 2);
  });

  test("invalid transitions return the same session", () => {
    const running = newSession();
    assert.equal(resumeSession(running, T0), running);
    const paused = pauseSession(running, T0);
    assert.equal(pauseSession(paused, T0 + 1), paused);
    const stopped = stopSession(running);
    for (const next of [
      pauseSession(stopped, T0),
      resumeSession(stopped, T0),
      stopSession(stopped),
      completeSession(stopped),
      interruptSession(stopped),
    ]) {
      assert.equal(next, stopped);
    }
  });

  test("stop, complete and interrupt end the session and bump generation", () => {
    const running = newSession();
    const paused = pauseSession(running, T0 + 1_000);
    assert.deepEqual([stopSession(running).status, stopSession(running).generation], ["cancelled", 1]);
    assert.deepEqual([stopSession(paused).status, stopSession(paused).generation], ["cancelled", 2]);
    assert.equal(completeSession(running).status, "completed");
    assert.equal(interruptSession(paused).status, "interrupted");
  });

  test("eventTimeSec gives whole UTC seconds for alarms", () => {
    const session = createSession({ id: "a", config: DEFAULT_CONFIG, startMs: T0 + 2_001 });
    const events = defaultEvents();
    assert.equal(eventTimeSec(session, events[0]), (T0 + 3_000) / 1000 + 55);
    assert.ok(events.every((e) => Number.isInteger(eventTimeSec(session, e))));
  });
});

describe("reconcile", () => {
  const events = defaultEvents();

  test("nothing is due before the first warning", () => {
    assert.deepEqual(reconcile(events, -1, 54_000), { lastEventIndex: -1, emit: null });
    assert.deepEqual(reconcile(events, -1, -3_000), { lastEventIndex: -1, emit: null });
  });

  test("an on-time callback emits its event exactly once", () => {
    const first = reconcile(events, -1, 55_000);
    assert.equal(first.lastEventIndex, 0);
    assert.equal(first.emit, events[0]);
    assert.deepEqual(reconcile(events, first.lastEventIndex, 55_000), {
      lastEventIndex: 0,
      emit: null,
    });
  });

  test("every alarm on time emits all 54 events in order", () => {
    let last = -1;
    const emitted = [];
    for (const event of events) {
      const result = reconcile(events, last, event.atSec * 1000 + 120);
      last = result.lastEventIndex;
      if (result.emit) emitted.push(result.emit.index);
    }
    assert.deepEqual(emitted, events.map((e) => e.index));
    assert.equal(last, 53);
  });

  test("an early callback within earlyMs still emits, beyond it does not", () => {
    assert.equal(reconcile(events, -1, 55_000 - 250).emit, events[0]);
    assert.deepEqual(reconcile(events, -1, 55_000 - 251), { lastEventIndex: -1, emit: null });
    assert.equal(reconcile(events, -1, 54_000, { earlyMs: 1_000 }).emit, events[0]);
  });

  test("a late callback emits only the latest due event within grace", () => {
    const result = reconcile(events, 0, 57_500);
    assert.equal(result.lastEventIndex, 2);
    assert.equal(result.emit, events[2]);
  });

  test("grace boundary", () => {
    // Transition at 60 s is the latest due event until the rest warning at 70 s.
    assert.equal(reconcile(events, 4, 62_000, { earlyMs: 0 }).emit, events[5]);
    assert.deepEqual(reconcile(events, 4, 62_001, { earlyMs: 0 }), { lastEventIndex: 5, emit: null });
    assert.equal(reconcile(events, 4, 61_000, { graceMs: 500 }).emit, null);
  });

  test("a late callback crossing several phases skips old events silently", () => {
    // Elapsed 140 s: rest of round 2 ends at 150, latest due is the transition at 135.
    const result = reconcile(events, 5, 140_000);
    assert.equal(events[result.lastEventIndex].atSec, 135);
    assert.equal(result.emit, null);
    assert.deepEqual(reconcile(events, result.lastEventIndex, 140_000), {
      lastEventIndex: result.lastEventIndex,
      emit: null,
    });
  });

  test("after the end everything is handled and nothing more is emitted", () => {
    assert.deepEqual(reconcile(events, 10, 999_000), { lastEventIndex: 53, emit: null });
    assert.equal(reconcile(events, 52, 360_000).emit, events[53]);
    assert.deepEqual(reconcile(events, 53, 360_000), { lastEventIndex: 53, emit: null });
  });
});

describe("lead-in", () => {
  test("default lead-in adds a 5 s countdown and a start event before work 1", () => {
    const events = buildEvents(defaultTimeline(), LEAD_IN_SECONDS);
    assert.equal(events.length, 60);
    assert.deepEqual(
      events.slice(0, 6).map((e) => [e.atSec, e.kind, e.secondsLeft, e.phaseIndex]),
      [
        [-5, "warning", 5, -1],
        [-4, "warning", 4, -1],
        [-3, "warning", 3, -1],
        [-2, "warning", 2, -1],
        [-1, "warning", 1, -1],
        [0, "start", undefined, -1],
      ],
    );
    events.forEach((event, i) => assert.equal(event.index, i));
    assert.deepEqual(events[6], { index: 6, atSec: 55, kind: "warning", secondsLeft: 5, phaseIndex: 0 });
  });

  test("a short lead-in only counts its own seconds", () => {
    const events = buildEvents(defaultTimeline(), 3);
    assert.deepEqual(
      events.slice(0, 4).map((e) => e.atSec),
      [-3, -2, -1, 0],
    );
  });

  test("no lead-in by default and invalid values are rejected", () => {
    assert.equal(buildEvents(defaultTimeline()).length, 54);
    assert.throws(() => buildEvents(defaultTimeline(), -1), RangeError);
    assert.throws(() => buildEvents(defaultTimeline(), 1.5), RangeError);
  });

  test("reconcile handles events before second 0", () => {
    const events = buildEvents(defaultTimeline(), LEAD_IN_SECONDS);
    assert.deepEqual(reconcile(events, -1, -6_000, { earlyMs: 0 }), { lastEventIndex: -1, emit: null });
    assert.equal(reconcile(events, -1, -5_000, { earlyMs: 0 }).emit, events[0]);
    assert.equal(reconcile(events, 4, 5, { earlyMs: 0 }).emit, events[5]);
  });
});

describe("pendingEvents", () => {
  const events = defaultEvents();

  test("before the start every event is pending", () => {
    assert.equal(pendingEvents(events, -1, -3_000).length, 54);
  });

  test("limit caps the window", () => {
    assert.deepEqual(
      pendingEvents(events, -1, 0, 3).map((e) => e.index),
      [0, 1, 2],
    );
  });

  test("skips handled and past events", () => {
    assert.deepEqual(
      pendingEvents(events, 2, 57_000, 2).map((e) => e.index),
      [3, 4],
    );
    assert.deepEqual(
      pendingEvents(events, -1, 57_000, 2).map((e) => e.index),
      [3, 4],
    );
    assert.deepEqual(pendingEvents(events, 53, 360_000), []);
  });
});
