// Pure session persistence and recovery rules: no @zos imports, time is passed in.
import {
  SCHEMA_VERSION,
  buildTimeline,
  completeSession,
  interruptSession,
  validateConfig,
} from "./interval-engine.js";

const STATUSES = ["running", "paused", "completed", "cancelled", "interrupted"];

export function serializeSession(session) {
  return JSON.stringify(session);
}

// Returns a clean session or null when the text is missing, corrupt or from another schema.
export function parseSession(text) {
  let data = null;
  try {
    data = typeof text === "string" ? JSON.parse(text) : null;
  } catch (e) {
    return null;
  }
  if (!data || typeof data !== "object" || data.schemaVersion !== SCHEMA_VERSION) return null;
  if (typeof data.id !== "string" || data.id.length === 0) return null;
  if (!STATUSES.includes(data.status)) return null;
  if (!Number.isInteger(data.generation) || data.generation < 0) return null;
  if (!Number.isInteger(data.lastEventIndex) || data.lastEventIndex < -1) return null;
  if (!Number.isFinite(data.originMs)) return null;
  if (data.pausedAtMs !== null && !Number.isFinite(data.pausedAtMs)) return null;
  if (data.status === "paused" && data.pausedAtMs === null) return null;
  const result = validateConfig(data.config);
  if (!result.ok) return null;
  return {
    schemaVersion: data.schemaVersion,
    id: data.id,
    generation: data.generation,
    config: result.config,
    status: data.status,
    originMs: data.originMs,
    pausedAtMs: data.pausedAtMs,
    lastEventIndex: data.lastEventIndex,
  };
}

// What to show when the app opens with a stored session. Never resumes a running session.
// kind: "none" | "paused" | "completed" | "interrupted"
export function recoverSession(session, nowMs) {
  if (!session) return { kind: "none", session: null };
  switch (session.status) {
    case "cancelled":
      return { kind: "none", session: null };
    case "completed":
      return { kind: "completed", session };
    case "interrupted":
      return { kind: "interrupted", session };
    case "paused":
      if (nowMs < session.pausedAtMs) return { kind: "interrupted", session: interruptSession(session) };
      return { kind: "paused", session };
    default: {
      const timeline = buildTimeline(session.config);
      const totalMs = timeline[timeline.length - 1].endSec * 1000;
      const elapsed = nowMs - session.originMs;
      if (elapsed >= totalMs) return { kind: "completed", session: completeSession(session) };
      // Closed mid-session (or the clock moved back): the state cannot be trusted.
      return { kind: "interrupted", session: interruptSession(session) };
    }
  }
}
