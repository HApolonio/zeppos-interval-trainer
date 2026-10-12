import {
  Vibrator,
  VIBRATOR_SCENE_NOTIFICATION,
  VIBRATOR_SCENE_STRONG_REMINDER,
} from "@zos/sensor";
import { create, id } from "@zos/media";
import { SOUND_AT_SECONDS_LEFT } from "../lib/settings.js";

// B3 on the GTR 4: SHORT_* and DURATION_LONG barely perceptible; the maintainer prefers the strong pattern
// for every warning. STRONG_REMINDER pulses until stop(), so it always has a stop time.
export const VIBRATION = {
  warning: { mode: VIBRATOR_SCENE_STRONG_REMINDER, stopAfterMs: 800 },
  start: { mode: VIBRATOR_SCENE_NOTIFICATION },
  transition: { mode: VIBRATOR_SCENE_NOTIFICATION },
  complete: { mode: VIBRATOR_SCENE_STRONG_REMINDER, stopAfterMs: 1500 },
};

let vibrator = null;
let stopTimer = null;

export function vibrate(kind) {
  const spec = VIBRATION[kind];
  if (!vibrator) vibrator = new Vibrator();
  if (stopTimer !== null) clearTimeout(stopTimer);
  stopTimer = null;
  vibrator.stop();
  vibrator.setMode(spec.mode);
  vibrator.start();
  if (spec.stopAfterMs) {
    stopTimer = setTimeout(() => {
      stopTimer = null;
      vibrator.stop();
    }, spec.stopAfterMs);
  }
}

export function stopVibration() {
  if (stopTimer !== null) clearTimeout(stopTimer);
  stopTimer = null;
  if (vibrator) vibrator.stop();
}

// Maintainer-provided countdown sound: 4 beeps one second apart, ~4.1 s (MP3, 48 kHz, 64 kbps).
export const SOUND_FILE = "audio/interval-beep.mp3";

export function shouldPlaySound(event) {
  return event.kind === "warning" && event.secondsLeft === SOUND_AT_SECONDS_LEFT;
}

// One player per process: creating a player per sound only played once (B3 build 6).
let player = null;
let onPreparedOnce = null;

function getPlayer() {
  if (player) return player;
  player = create(id.PLAYER);
  player.addEventListener(player.event.PREPARE, (ok) => {
    if (ok) player.start();
    if (onPreparedOnce) onPreparedOnce(ok);
    onPreparedOnce = null;
  });
  player.addEventListener(player.event.COMPLETE, () => player.stop());
  player.setSource(player.source.FILE, { file: SOUND_FILE });
  return player;
}

export function playSound(onPrepared) {
  const p = getPlayer();
  p.stop();
  onPreparedOnce = onPrepared || null;
  p.prepare();
}

export function stopSound() {
  if (player) player.stop();
}
