import * as hmUI from "@zos/ui";
import { GESTURE_RIGHT, MODAL_CONFIRM, createModal, offGesture, onGesture } from "@zos/interaction";
import { pauseDropWristScreenOff, resetDropWristScreenOff, setPageBrightTime } from "@zos/display";
import { Time } from "@zos/sensor";
import { log } from "@zos/utils";
import {
  LEAD_IN_SECONDS,
  buildEvents,
  buildTimeline,
  completeSession,
  createSession,
  elapsedMs,
  getPosition,
  interruptSession,
  pauseSession,
  reconcile,
  resumeSession,
  stopSession,
  validateConfig,
} from "../../../lib/interval-engine.js";
import { formatClock } from "../../../lib/presets.js";
import { DEFAULT_SETTINGS, alertPlan } from "../../../lib/settings.js";
import { PAGE, goBack, openInPlace, readParams } from "../../../utils/navigation.js";
import { playSound, stopSound, stopVibration, vibrate } from "../../../utils/alerts.js";
import { clearSession, loadSession, loadSettings, saveSession } from "../../../utils/session-store.js";
import {
  LABEL_STYLE,
  PAUSE_BUTTON,
  RESUME_BUTTON,
  ROUND_STYLE,
  STOP_BUTTON,
  TIME_STYLE,
  createProgress,
  hideStatusBar,
} from "zosLoader:./index.page.[pf].layout.js";

const logger = log.getLogger("session-page");
const time = new Time();

// Ticks land just after each whole session second, where events and display changes happen.
const TICK_OFFSET_MS = 5;
// Extra time before the first lead-in event, so the first sound can prepare.
const START_MARGIN_MS = 500;
// Screen stays on this long past the planned end, and while paused.
const KEEP_ON_MARGIN_MS = 10000;
const PAUSED_KEEP_ON_MS = 60000;
// A clock that jumps back by more than this during a run cannot be trusted.
const CLOCK_BACK_TOLERANCE_MS = 2000;
// Lets the 1.5 s completion vibration and the last beep finish before the page is replaced.
const COMPLETE_HOLD_MS = 1700;

const COLOR = {
  work: 0x2ecc71,
  rest: 0x29b6f6,
  warning: 0xffb300,
  paused: 0x9e9e9e,
  text: 0xffffff,
  muted: 0xb0b0b0,
};

let params = {};
let settings = DEFAULT_SETTINGS;
let session = null;
let timeline = null;
let events = null;
let timer = null;
let lastTickMs = 0;
let finishing = false;
let widgets = {};
let progress = null;
let shown = {};

function clearTimer() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}

function stopAlerts() {
  stopVibration();
  stopSound();
}

function keepScreenOn(ms) {
  setPageBrightTime({ brightTime: ms });
  pauseDropWristScreenOff({ duration: ms });
}

function remainingMs(nowMs) {
  return session.originMs + timeline[timeline.length - 1].endSec * 1000 - nowMs;
}

// Resume rebuilds from the stored deadlines; a new run starts after the lead-in.
function openSession() {
  const nowMs = time.getTime();
  if (params.resume) {
    const stored = loadSession();
    if (stored?.status !== "paused") return null;
    return resumeSession(stored, nowMs);
  }
  const checked = validateConfig(params.config);
  if (!checked.ok) return null;
  return createSession({
    id: nowMs.toString(36),
    config: checked.config,
    startMs: nowMs + LEAD_IN_SECONDS * 1000 + START_MARGIN_MS,
  });
}

function alertFor(event) {
  const plan = alertPlan(settings, event);
  if (plan.vibrate) {
    try {
      vibrate(event.kind);
    } catch (e) {
      logger.error("vibration failed " + e);
    }
  }
  if (!plan.sound) return;
  try {
    playSound((ok) => logger.log("sound prepared " + ok));
  } catch (e) {
    logger.error("sound failed " + e);
  }
}

function scheduleTick() {
  const intoSecond = ((elapsedMs(session, time.getTime()) % 1000) + 1000) % 1000;
  timer = setTimeout(tick, 1000 - intoSecond + TICK_OFFSET_MS);
}

function tick() {
  timer = null;
  const nowMs = time.getTime();
  if (nowMs < lastTickMs - CLOCK_BACK_TOLERANCE_MS) {
    interrupt();
    return;
  }
  lastTickMs = nowMs;
  const elapsed = elapsedMs(session, nowMs);
  // The tick is never early, so no early tolerance here.
  const result = reconcile(events, session.lastEventIndex, elapsed, { earlyMs: 0 });
  if (result.lastEventIndex !== session.lastEventIndex) {
    session = { ...session, lastEventIndex: result.lastEventIndex };
    if (result.emit) alertFor(result.emit);
  }
  const position = getPosition(timeline, elapsed);
  if (position.state === "done") {
    complete();
    return;
  }
  paintRunning(position, elapsed);
  scheduleTick();
}

function complete() {
  finishing = true;
  session = completeSession(session);
  saveSession(session);
  paintDone();
  timer = setTimeout(() => {
    timer = null;
    openInPlace(PAGE.result, { kind: "completed", config: session.config });
  }, COMPLETE_HOLD_MS);
}

function interrupt() {
  finishing = true;
  clearTimer();
  stopAlerts();
  session = interruptSession(session);
  saveSession(session);
  openInPlace(PAGE.result, { kind: "interrupted", config: session.config });
}

function pause() {
  if (finishing || session.status !== "running") return;
  clearTimer();
  stopAlerts();
  session = pauseSession(session, time.getTime());
  saveSession(session);
  keepScreenOn(PAUSED_KEEP_ON_MS);
  paintPaused();
}

function resume() {
  if (finishing || session.status !== "paused") return;
  const nowMs = time.getTime();
  session = resumeSession(session, nowMs);
  if (session.status !== "running") {
    interrupt();
    return;
  }
  lastTickMs = nowMs;
  saveSession(session);
  keepScreenOn(remainingMs(nowMs) + KEEP_ON_MARGIN_MS);
  paintRunning(getPosition(timeline, elapsedMs(session, nowMs)), elapsedMs(session, nowMs));
  scheduleTick();
}

function stop() {
  finishing = true;
  clearTimer();
  stopAlerts();
  session = stopSession(session);
  // A stopped session is not kept for recovery.
  clearSession();
  goBack();
}

// The session keeps running behind the dialog.
function askStop() {
  if (finishing) return;
  createModal({
    content: "Stop workout?",
    onClick: ({ type }) => {
      if (type === MODAL_CONFIRM) stop();
    },
  });
}

function setText(slot, style, text, color) {
  const last = shown[slot];
  if (last && last.text === text && last.color === color) return;
  if (last && last.color === color) widgets[slot].setProperty(hmUI.prop.TEXT, text);
  else widgets[slot].setProperty(hmUI.prop.MORE, { ...style, text, color });
  shown[slot] = { text, color };
}

function setBar(fraction, color) {
  const key = progress.key(fraction);
  if (shown.bar && shown.bar.key === key && shown.bar.color === color) return;
  progress.set(fraction, color);
  shown.bar = { key, color };
}

function setButtons(pauseVisible, resumeVisible, stopVisible) {
  const next = [pauseVisible, resumeVisible, stopVisible];
  ["pause", "resume", "stop"].forEach((slot, i) => {
    if (shown[slot] === next[i]) return;
    widgets[slot].setProperty(hmUI.prop.VISIBLE, next[i]);
    shown[slot] = next[i];
  });
}

function paintRunning(position, elapsed) {
  const rounds = session.config.rounds;
  if (position.state === "waiting") {
    setText("label", LABEL_STYLE, "READY", COLOR.text);
    setText("time", TIME_STYLE, String(Math.ceil(-elapsed / 1000)), COLOR.warning);
    setText("round", ROUND_STYLE, "Round 1 / " + rounds, COLOR.muted);
    setBar(0, COLOR.warning);
  } else {
    const { phase } = position;
    const phaseColor = COLOR[phase.type];
    const warning = position.inWarning;
    setText("label", LABEL_STYLE, phase.type.toUpperCase(), phaseColor);
    setText("time", TIME_STYLE, formatClock(position.displaySec), warning ? COLOR.warning : COLOR.text);
    setText("round", ROUND_STYLE, "Round " + phase.round + " / " + rounds, COLOR.muted);
    setBar(position.phaseElapsedMs / ((phase.endSec - phase.startSec) * 1000), warning ? COLOR.warning : phaseColor);
  }
  setButtons(true, false, true);
}

function paintPaused() {
  const elapsed = elapsedMs(session, time.getTime());
  const position = getPosition(timeline, elapsed);
  const { phase } = position;
  const display = position.state === "waiting" ? Math.ceil(-elapsed / 1000) : position.displaySec;
  setText("label", LABEL_STYLE, "PAUSED", COLOR.paused);
  setText("time", TIME_STYLE, position.state === "waiting" ? String(display) : formatClock(display), COLOR.text);
  setText("round", ROUND_STYLE, phase.type.toUpperCase() + " " + phase.round + " / " + session.config.rounds, COLOR.muted);
  setBar(position.state === "waiting" ? 0 : position.phaseElapsedMs / ((phase.endSec - phase.startSec) * 1000), COLOR.paused);
  setButtons(false, true, true);
}

function paintDone() {
  setText("label", LABEL_STYLE, "DONE", COLOR.work);
  setText("time", TIME_STYLE, formatClock(0), COLOR.text);
  setText("round", ROUND_STYLE, "Completed", COLOR.muted);
  setBar(1, COLOR.work);
  setButtons(false, false, false);
}

Page({
  onInit(raw) {
    params = readParams(raw);
  },
  build() {
    hideStatusBar();
    session = openSession();
    if (!session) {
      goBack();
      return;
    }
    if (session.status !== "running") {
      // Resuming with the clock moved back: the stored state cannot be trusted.
      saveSession(session);
      openInPlace(PAGE.result, { kind: "interrupted", config: session.config });
      return;
    }
    const nowMs = time.getTime();
    settings = loadSettings();
    timeline = buildTimeline(session.config);
    events = buildEvents(timeline, LEAD_IN_SECONDS);
    lastTickMs = nowMs;
    finishing = false;
    shown = {};

    progress = createProgress(COLOR.warning);
    widgets.label = hmUI.createWidget(hmUI.widget.TEXT, LABEL_STYLE);
    widgets.time = hmUI.createWidget(hmUI.widget.TEXT, TIME_STYLE);
    widgets.round = hmUI.createWidget(hmUI.widget.TEXT, ROUND_STYLE);
    widgets.pause = hmUI.createWidget(hmUI.widget.BUTTON, { ...PAUSE_BUTTON, click_func: pause });
    widgets.resume = hmUI.createWidget(hmUI.widget.BUTTON, { ...RESUME_BUTTON, click_func: resume });
    widgets.stop = hmUI.createWidget(hmUI.widget.BUTTON, { ...STOP_BUTTON, click_func: askStop });
    // The back swipe asks for confirmation instead of leaving the running session.
    onGesture({
      callback: (event) => {
        if (event !== GESTURE_RIGHT) return false;
        askStop();
        return true;
      },
    });

    saveSession(session);
    keepScreenOn(remainingMs(nowMs) + KEEP_ON_MARGIN_MS);
    paintRunning(getPosition(timeline, elapsedMs(session, nowMs)), elapsedMs(session, nowMs));
    scheduleTick();
    logger.log("session start " + session.id + " resumed " + Boolean(params.resume));
  },
  onDestroy() {
    clearTimer();
    stopAlerts();
    offGesture();
    resetDropWristScreenOff();
    session = null;
    widgets = {};
    progress = null;
    shown = {};
  },
});
