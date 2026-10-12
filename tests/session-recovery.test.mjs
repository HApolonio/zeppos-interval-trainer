import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CONFIG,
  completeSession,
  createSession,
  pauseSession,
  stopSession,
} from "../lib/interval-engine.js";
import { parseSession, recoverSession, serializeSession } from "../lib/session-recovery.js";

const T0 = 1_790_000_000_000;
const running = () => createSession({ id: "s1", config: DEFAULT_CONFIG, startMs: T0 });

describe("serializeSession and parseSession", () => {
  test("round trip", () => {
    const paused = pauseSession(running(), T0 + 20_000);
    assert.deepEqual(parseSession(serializeSession(paused)), paused);
  });

  test("drops unknown fields", () => {
    const text = JSON.stringify({ ...running(), alarmIds: [1, 2], extra: true });
    assert.deepEqual(parseSession(text), running());
  });

  test("rejects missing, corrupt and foreign data", () => {
    const base = running();
    const bad = [
      null,
      undefined,
      "",
      "{",
      "[]",
      JSON.stringify({ ...base, schemaVersion: 99 }),
      JSON.stringify({ ...base, id: "" }),
      JSON.stringify({ ...base, status: "weird" }),
      JSON.stringify({ ...base, generation: -1 }),
      JSON.stringify({ ...base, lastEventIndex: -2 }),
      JSON.stringify({ ...base, lastEventIndex: 1.5 }),
      JSON.stringify({ ...base, originMs: "x" }),
      JSON.stringify({ ...base, pausedAtMs: "x" }),
      JSON.stringify({ ...base, status: "paused", pausedAtMs: null }),
      JSON.stringify({ ...base, config: { workSec: 5, restSec: 15, rounds: 5 } }),
    ];
    for (const text of bad) assert.equal(parseSession(text), null, String(text));
  });
});

describe("recoverSession", () => {
  test("nothing stored or cancelled shows nothing", () => {
    assert.deepEqual(recoverSession(null, T0), { kind: "none", session: null });
    assert.deepEqual(recoverSession(stopSession(running()), T0), { kind: "none", session: null });
  });

  test("a paused session can be resumed, however long ago it was paused", () => {
    const paused = pauseSession(running(), T0 + 20_000);
    assert.deepEqual(recoverSession(paused, T0 + 20_000), { kind: "paused", session: paused });
    assert.deepEqual(recoverSession(paused, T0 + 86_400_000), { kind: "paused", session: paused });
  });

  test("a paused session with the clock moved back is interrupted", () => {
    const paused = pauseSession(running(), T0 + 20_000);
    const result = recoverSession(paused, T0 + 19_999);
    assert.equal(result.kind, "interrupted");
    assert.equal(result.session.status, "interrupted");
  });

  test("a running session that would have finished meanwhile is completed", () => {
    for (const nowMs of [T0 + 360_000, T0 + 9_999_999]) {
      const result = recoverSession(running(), nowMs);
      assert.equal(result.kind, "completed");
      assert.equal(result.session.status, "completed");
    }
  });

  test("a running session closed before the end is interrupted, never resumed", () => {
    for (const nowMs of [T0 - 6_000, T0, T0 + 120_000, T0 + 359_999]) {
      const result = recoverSession(running(), nowMs);
      assert.equal(result.kind, "interrupted", String(nowMs));
      assert.equal(result.session.status, "interrupted");
    }
  });

  test("stored completed and interrupted sessions are shown again", () => {
    const done = completeSession(running());
    assert.deepEqual(recoverSession(done, T0 + 999_999), { kind: "completed", session: done });
    const interrupted = recoverSession(running(), T0 + 1_000).session;
    assert.deepEqual(recoverSession(interrupted, T0 + 2_000), { kind: "interrupted", session: interrupted });
  });
});
