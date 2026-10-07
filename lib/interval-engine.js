// Pure interval engine: no @zos imports, time is always passed in as milliseconds.

export const SCHEMA_VERSION = 1;
export const WARNING_SECONDS = 5;
export const LEAD_IN_SECONDS = 5;
export const GRACE_MS = 2000;
export const EARLY_MS = 250;

export const LIMITS = Object.freeze({
  workSec: Object.freeze({ min: 6, max: 3600 }),
  restSec: Object.freeze({ min: 6, max: 3600 }),
  rounds: Object.freeze({ min: 1, max: 99 }),
});

export const DEFAULT_CONFIG = Object.freeze({ workSec: 60, restSec: 15, rounds: 5 });

export function validateConfig(config) {
  if (config === null || typeof config !== "object") {
    return { ok: false, errors: [{ field: null, reason: "not-object" }] };
  }
  const errors = [];
  for (const field of Object.keys(LIMITS)) {
    const value = config[field];
    const { min, max } = LIMITS[field];
    if (!Number.isInteger(value)) errors.push({ field, reason: "not-integer" });
    else if (value < min) errors.push({ field, reason: "below-min" });
    else if (value > max) errors.push({ field, reason: "above-max" });
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    config: { workSec: config.workSec, restSec: config.restSec, rounds: config.rounds },
  };
}

function requireValidConfig(config) {
  const result = validateConfig(config);
  if (!result.ok) {
    const detail = result.errors.map((e) => e.field + " " + e.reason).join(", ");
    throw new RangeError("Invalid interval config: " + detail);
  }
  return result.config;
}

export function totalSeconds(config) {
  const c = requireValidConfig(config);
  return c.rounds * c.workSec + (c.rounds - 1) * c.restSec;
}

export function buildTimeline(config) {
  const c = requireValidConfig(config);
  const phases = [];
  let t = 0;
  for (let round = 1; round <= c.rounds; round++) {
    phases.push({ type: "work", round, startSec: t, endSec: t + c.workSec });
    t += c.workSec;
    if (round < c.rounds) {
      phases.push({ type: "rest", round, startSec: t, endSec: t + c.restSec });
      t += c.restSec;
    }
  }
  return phases;
}

export function buildEvents(timeline, leadInSec = 0) {
  if (!Number.isInteger(leadInSec) || leadInSec < 0) {
    throw new RangeError("leadInSec must be a non-negative integer");
  }
  const events = [];
  // Lead-in before second 0 counts down like a phase end (phaseIndex -1), then starts work.
  if (leadInSec > 0) {
    for (let secondsLeft = Math.min(WARNING_SECONDS, leadInSec); secondsLeft >= 1; secondsLeft--) {
      events.push({ index: events.length, atSec: -secondsLeft, kind: "warning", secondsLeft, phaseIndex: -1 });
    }
    events.push({ index: events.length, atSec: 0, kind: "start", phaseIndex: -1 });
  }
  const lastPhaseIndex = timeline.length - 1;
  timeline.forEach((phase, phaseIndex) => {
    for (let secondsLeft = WARNING_SECONDS; secondsLeft >= 1; secondsLeft--) {
      events.push({
        index: events.length,
        atSec: phase.endSec - secondsLeft,
        kind: "warning",
        secondsLeft,
        phaseIndex,
      });
    }
    events.push({
      index: events.length,
      atSec: phase.endSec,
      kind: phaseIndex === lastPhaseIndex ? "complete" : "transition",
      phaseIndex,
    });
  });
  return events;
}

export function getPosition(timeline, elapsedMs) {
  const lastPhaseIndex = timeline.length - 1;
  const totalMs = timeline[lastPhaseIndex].endSec * 1000;

  if (elapsedMs >= totalMs) {
    return {
      state: "done",
      phaseIndex: lastPhaseIndex,
      phase: timeline[lastPhaseIndex],
      phaseElapsedMs: (timeline[lastPhaseIndex].endSec - timeline[lastPhaseIndex].startSec) * 1000,
      remainingMs: 0,
      displaySec: 0,
      inWarning: false,
      totalRemainingMs: 0,
    };
  }

  const waiting = elapsedMs < 0;
  const at = waiting ? 0 : elapsedMs;
  let phaseIndex = 0;
  while (at >= timeline[phaseIndex].endSec * 1000) phaseIndex++;
  const phase = timeline[phaseIndex];
  const remainingMs = phase.endSec * 1000 - at;

  return {
    state: waiting ? "waiting" : "active",
    phaseIndex,
    phase,
    phaseElapsedMs: at - phase.startSec * 1000,
    remainingMs,
    displaySec: Math.ceil(remainingMs / 1000),
    inWarning: !waiting && remainingMs <= WARNING_SECONDS * 1000,
    totalRemainingMs: totalMs - at,
  };
}

export function createSession({ id, config, startMs }) {
  if (typeof id !== "string" || id.length === 0) {
    throw new TypeError("Session id must be a non-empty string");
  }
  if (!Number.isFinite(startMs)) {
    throw new TypeError("startMs must be a finite number");
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    generation: 0,
    config: requireValidConfig(config),
    status: "running",
    // Alarms take whole UTC seconds, so second 0 must be on a whole second.
    originMs: Math.ceil(startMs / 1000) * 1000,
    pausedAtMs: null,
    lastEventIndex: -1,
    alarmIds: [],
  };
}

export function elapsedMs(session, nowMs) {
  const reference = session.pausedAtMs === null ? nowMs : session.pausedAtMs;
  return reference - session.originMs;
}

export function pauseSession(session, nowMs) {
  if (session.status !== "running") return session;
  return { ...session, status: "paused", pausedAtMs: nowMs, generation: session.generation + 1 };
}

export function resumeSession(session, nowMs) {
  if (session.status !== "paused") return session;
  const pausedForMs = nowMs - session.pausedAtMs;
  if (pausedForMs < 0) return interruptSession(session);
  return {
    ...session,
    status: "running",
    originMs: session.originMs + Math.ceil(pausedForMs / 1000) * 1000,
    pausedAtMs: null,
    generation: session.generation + 1,
  };
}

function endSession(session, status) {
  if (session.status !== "running" && session.status !== "paused") return session;
  return { ...session, status, generation: session.generation + 1 };
}

export function stopSession(session) {
  return endSession(session, "cancelled");
}

export function completeSession(session) {
  return endSession(session, "completed");
}

export function interruptSession(session) {
  return endSession(session, "interrupted");
}

export function reconcile(events, lastHandledIndex, elapsed, options = {}) {
  const graceMs = options.graceMs === undefined ? GRACE_MS : options.graceMs;
  const earlyMs = options.earlyMs === undefined ? EARLY_MS : options.earlyMs;

  let dueIndex = lastHandledIndex;
  for (let i = lastHandledIndex + 1; i < events.length; i++) {
    if (events[i].atSec * 1000 > elapsed + earlyMs) break;
    dueIndex = i;
  }
  if (dueIndex === lastHandledIndex) return { lastEventIndex: lastHandledIndex, emit: null };

  const event = events[dueIndex];
  const lateMs = elapsed - event.atSec * 1000;
  return { lastEventIndex: dueIndex, emit: lateMs <= graceMs ? event : null };
}

export function pendingEvents(events, lastHandledIndex, elapsed, limit = Infinity) {
  const pending = [];
  for (let i = lastHandledIndex + 1; i < events.length && pending.length < limit; i++) {
    if (events[i].atSec * 1000 > elapsed) pending.push(events[i]);
  }
  return pending;
}

export function eventTimeSec(session, event) {
  return session.originMs / 1000 + event.atSec;
}
