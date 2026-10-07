// Hardware spike (B3/B4), foreground mode only. Temporary: replaced by the session screen (C2).
import * as hmUI from "@zos/ui";
import { pauseDropWristScreenOff, setPageBrightTime, setWakeUpRelaunch } from "@zos/display";
import { Time } from "@zos/sensor";
import { LocalStorage } from "@zos/storage";
import { log } from "@zos/utils";
import {
  LEAD_IN_SECONDS,
  buildEvents,
  buildTimeline,
  createSession,
  getPosition,
  reconcile,
} from "../../../lib/interval-engine.js";
import {
  MISSING_AFTER_MS,
  SPIKE_CONFIG,
  SPIKE_LOG_KEY,
  SPIKE_RUN_KEY,
  entryLines,
  formatReport,
  summarizeRun,
} from "../../../lib/spike-report.js";
import {
  playSound,
  shouldPlaySound,
  stopSound,
  stopVibration,
  systemVolume,
  vibrate,
} from "../../../utils/alerts.js";
import {
  TITLE_STYLE,
  REPORT_STYLE,
  REPORT_LINE_H,
  REPORT_TAIL_H,
  START_BUTTON,
  STOP_BUTTON,
} from "zosLoader:./index.page.[pf].layout.js";

// Ticks land just after each whole session second, where events and display changes happen.
const TICK_OFFSET_MS = 5;
// Extra time before the first lead-in event, so the first sound can prepare.
const START_MARGIN_MS = 500;
const logger = log.getLogger("spike-page");
const time = new Time();

let titleWidget = null;
let reportWidget = null;
let volume = null;
// Active run kept in memory; the page is the only writer of storage.
let active = null;
let shown = { title: null, body: null, height: null };

function persist(run, spikeLog) {
  const storage = new LocalStorage();
  storage.setItem(SPIKE_LOG_KEY, spikeLog);
  storage.setItem(SPIKE_RUN_KEY, run);
}

function startRun() {
  endRun(true);
  const nowMs = time.getTime();
  const session = createSession({
    id: nowMs.toString(36),
    config: SPIKE_CONFIG,
    startMs: nowMs + LEAD_IN_SECONDS * 1000 + START_MARGIN_MS,
  });
  const timeline = buildTimeline(session.config);
  const run = {
    runId: session.id,
    originMs: session.originMs,
    config: session.config,
    leadInSec: LEAD_IN_SECONDS,
    cancelledAtMs: null,
  };
  const endMs = run.originMs + timeline[timeline.length - 1].endSec * 1000;
  const keepOnMs = endMs - nowMs + 10000;
  const brightResult = setPageBrightTime({ brightTime: keepOnMs });
  const wristResult = pauseDropWristScreenOff({ duration: keepOnMs });
  active = {
    run,
    spikeLog: { runId: run.runId, lastEventIndex: -1, entries: [] },
    timeline,
    events: buildEvents(timeline, LEAD_IN_SECONDS),
    endMs,
    screenInfo: "Keep on " + brightResult + "/" + wristResult + " " + Math.round(keepOnMs / 1000) + "s",
    timer: null,
  };
  persist(active.run, active.spikeLog);
  scheduleTick();
  logger.log("spike start " + run.runId + " " + active.screenInfo);
}

function scheduleTick() {
  const sinceOrigin = time.getTime() - active.run.originMs;
  const intoSecond = ((sinceOrigin % 1000) + 1000) % 1000;
  active.timer = setTimeout(tick, 1000 - intoSecond + TICK_OFFSET_MS);
}

function alertFor(event, entry) {
  try {
    vibrate(event.kind);
    entry.emitted = event.index;
    if (shouldPlaySound(event)) {
      entry.sound = true;
      playSound((ok) => logger.log("spike sound prepared " + ok));
    }
  } catch (e) {
    entry.err = String(e).slice(0, 80);
    logger.error("spike alert failed " + entry.err);
  }
}

function tick() {
  const nowMs = time.getTime();
  const elapsed = nowMs - active.run.originMs;
  // The tick is never early, so no early tolerance here.
  const result = reconcile(active.events, active.spikeLog.lastEventIndex, elapsed, { earlyMs: 0 });
  if (result.lastEventIndex !== active.spikeLog.lastEventIndex) {
    const entry = { i: result.lastEventIndex, firedMs: nowMs };
    active.spikeLog.lastEventIndex = result.lastEventIndex;
    if (result.emit) alertFor(result.emit, entry);
    active.spikeLog.entries.push(entry);
    render();
  }
  const position = getPosition(active.timeline, elapsed);
  if (position.state === "waiting") setTitle("READY " + Math.ceil(-elapsed / 1000));
  else if (position.state === "active") setTitle(position.phase.type.toUpperCase() + " " + position.displaySec);
  if (nowMs > active.endMs + MISSING_AFTER_MS) {
    endRun(false);
    render();
    return;
  }
  scheduleTick();
}

function endRun(cancelled) {
  if (!active) return;
  clearTimeout(active.timer);
  if (cancelled) {
    active.run.cancelledAtMs = time.getTime();
    stopVibration();
    stopSound();
  }
  persist(active.run, active.spikeLog);
  logger.log("spike end " + active.run.runId + " cancelled " + cancelled + " entries " + active.spikeLog.entries.length);
  active = null;
}

function setTitle(title) {
  if (title === shown.title) return;
  titleWidget.setProperty(hmUI.prop.TEXT, title);
  shown.title = title;
}

// While a run is active the report comes from memory; otherwise from storage (last run).
function render() {
  let run = null;
  let spikeLog = null;
  if (active) {
    run = active.run;
    spikeLog = active.spikeLog;
  } else {
    const storage = new LocalStorage();
    run = storage.getItem(SPIKE_RUN_KEY, null);
    spikeLog = storage.getItem(SPIKE_LOG_KEY, null);
  }
  const { title, body } = formatReport(summarizeRun(run, spikeLog, time.getTime()), {
    infoLines: ["Vol " + volume].concat(active ? [active.screenInfo] : []),
    entries: entryLines(run, spikeLog),
  });
  if (!active) setTitle(title);
  if (body === shown.body) return;
  const height = body.split("\n").length * REPORT_LINE_H + REPORT_TAIL_H;
  if (height !== shown.height) {
    reportWidget.setProperty(hmUI.prop.MORE, {
      x: REPORT_STYLE.x,
      y: REPORT_STYLE.y,
      w: REPORT_STYLE.w,
      h: height,
    });
    shown.height = height;
  }
  reportWidget.setProperty(hmUI.prop.TEXT, body);
  shown.body = body;
}

Page({
  build() {
    setWakeUpRelaunch({ relaunch: true });
    try {
      volume = systemVolume();
    } catch (e) {
      volume = "err";
    }
    titleWidget = hmUI.createWidget(hmUI.widget.TEXT, TITLE_STYLE);
    reportWidget = hmUI.createWidget(hmUI.widget.TEXT, REPORT_STYLE);
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...START_BUTTON,
      click_func: () => {
        startRun();
        render();
      },
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...STOP_BUTTON,
      click_func: () => {
        endRun(true);
        render();
      },
    });
    render();
  },
  onDestroy() {
    // Keep what was measured if the page is closed mid-run; the rest then shows as missing.
    if (active) {
      clearTimeout(active.timer);
      stopVibration();
      stopSound();
      persist(active.run, active.spikeLog);
      active = null;
    }
    shown = { title: null, body: null, height: null };
  },
});
