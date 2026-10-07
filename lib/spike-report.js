// Hardware spike (B3/B4), foreground mode: storage keys and report math. Pure, no @zos imports.
import { DEFAULT_CONFIG, buildEvents, buildTimeline, totalSeconds } from "./interval-engine.js";

// Acceptance runs use the product default (60/15 x 5).
export const SPIKE_CONFIG = DEFAULT_CONFIG;
export const SPIKE_RUN_KEY = "spike.run";
export const SPIKE_LOG_KEY = "spike.log";
export const MISSING_AFTER_MS = 5000;

// run: { runId, originMs, config, leadInSec, cancelledAtMs }
// log: { runId, lastEventIndex, entries: [{ i, firedMs, emitted?, sound?, err? }] }

export function runEvents(run) {
  return buildEvents(buildTimeline(run.config), run.leadInSec || 0);
}

export function summarizeRun(run, spikeLog, nowMs) {
  if (!run) return null;
  const events = runEvents(run);
  const plannedMs = (index) => run.originMs + events[index].atSec * 1000;
  const startMs = plannedMs(0);
  const endMs = plannedMs(events.length - 1);

  const firstFiredMs = new Map();
  let handled = 0;
  let alerts = 0;
  let sounds = 0;
  let errors = 0;
  const entries = spikeLog && spikeLog.runId === run.runId ? spikeLog.entries : [];
  for (const entry of entries) {
    if (entry.err) errors++;
    if (!(Number.isInteger(entry.i) && entry.i >= 0 && entry.i < events.length)) continue;
    handled++;
    if (entry.emitted !== undefined) alerts++;
    if (entry.sound) sounds++;
    if (!firstFiredMs.has(entry.i)) firstFiredMs.set(entry.i, entry.firedMs);
  }

  let missing = 0;
  let pending = 0;
  for (const event of events) {
    if (firstFiredMs.has(event.index)) continue;
    if (plannedMs(event.index) + MISSING_AFTER_MS < nowMs) missing++;
    else pending++;
  }

  const firedIndexes = [...firstFiredMs.keys()].sort((a, b) => a - b);
  const lateness = firedIndexes.map((index) => firstFiredMs.get(index) - plannedMs(index));
  const hasLateness = lateness.length > 0;

  let state = "running";
  if (run.cancelledAtMs !== null) state = "stopped";
  else if (nowMs < startMs) state = "starting";
  else if (nowMs > endMs + MISSING_AFTER_MS) state = "done";

  return {
    state,
    runId: run.runId,
    planned: events.length,
    fired: firstFiredMs.size,
    firedIndexes,
    duplicates: handled - firstFiredMs.size,
    missing,
    pending,
    minLateMs: hasLateness ? Math.min(...lateness) : null,
    avgLateMs: hasLateness ? Math.round(lateness.reduce((a, b) => a + b, 0) / lateness.length) : null,
    maxLateMs: hasLateness ? Math.max(...lateness) : null,
    firstLateMs: hasLateness ? lateness[0] : null,
    lastLateMs: hasLateness ? lateness[lateness.length - 1] : null,
    alerts,
    sounds,
    errors,
  };
}

const show = (value) => (value === null || value === undefined ? "-" : String(value));
const signed = (ms) => (ms >= 0 ? "+" : "") + ms;
const seconds = (ms) => (ms / 1000).toFixed(1);

export function formatDuration(totalSec) {
  return Math.floor(totalSec / 60) + ":" + String(totalSec % 60).padStart(2, "0");
}

export function compressRanges(sortedIndexes) {
  const parts = [];
  let start = null;
  let prev = null;
  for (const index of sortedIndexes) {
    if (prev !== null && index === prev + 1) {
      prev = index;
      continue;
    }
    if (start !== null) parts.push(start === prev ? String(start) : start + "-" + prev);
    start = index;
    prev = index;
  }
  if (start !== null) parts.push(start === prev ? String(start) : start + "-" + prev);
  return parts.length > 0 ? parts.join(",") : "-";
}

// One line per handled event: index, kind letter, time since origin, lateness, flags.
export function entryLines(run, spikeLog) {
  if (!run || !spikeLog || spikeLog.runId !== run.runId) return [];
  const events = runEvents(run);
  return spikeLog.entries.map((entry) => {
    const event = events[entry.i];
    const at = "@" + seconds(entry.firedMs - run.originMs) + "s";
    const flags = [];
    if (entry.emitted !== undefined) flags.push("V");
    if (entry.sound) flags.push("SND");
    if (entry.err) flags.push("ERR");
    const head = event
      ? "#" + entry.i + " " + event.kind[0] + " " + at + " " + signed(entry.firedMs - (run.originMs + event.atSec * 1000))
      : "#? " + at;
    return [head].concat(flags).join(" ");
  });
}

// extras: { infoLines: string[], entries: string[] }
export function formatReport(summary, extras) {
  const infoLines = extras.infoLines || [];
  if (!summary) {
    return {
      title: "IDLE",
      body: ["Start: " + formatDuration(totalSeconds(SPIKE_CONFIG)) + " session", "after a 5 s lead-in"]
        .concat(infoLines)
        .join("\n"),
    };
  }
  const s = summary;
  const lines = infoLines
    .concat([
      "Fired " + s.fired + "/" + s.planned + " dup " + s.duplicates,
      "Miss " + s.missing + " pending " + s.pending,
      "Idx " + compressRanges(s.firedIndexes),
      "Late " + show(s.minLateMs) + "/" + show(s.avgLateMs) + "/" + show(s.maxLateMs) + " ms",
      "Drift " + show(s.firstLateMs) + " > " + show(s.lastLateMs) + " ms",
      "Alerts " + s.alerts + " snd " + s.sounds + " err " + s.errors,
      "-- events --",
    ])
    .concat(extras.entries || []);
  return { title: s.state.toUpperCase(), body: lines.join("\n") };
}
