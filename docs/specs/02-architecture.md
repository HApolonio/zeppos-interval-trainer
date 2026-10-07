# Architecture Spec

Status: revised on 2026-10-07 after the [hardware gate](./04-hardware-gate.md): foreground session, no alarms or app service. Names are planned, not final.

## Principles
1. Deadline-based: all state is absolute timestamps and whole-second durations. Never decrement counters.
2. The session page owns timing and alerts while it is open. It keeps the screen on, ticks just after every whole session second and emits alerts from `reconcile`, so a late tick never replays or duplicates alerts.
3. Persisted state is for presets and recovery after the app closes, not for sharing with a background process.
4. Pure logic is isolated in `lib/` and unit-tested; Zepp APIs live in thin adapters.

## Why not background alerts (B3, measured on the GTR 4)
Alarm-started single-execution services gave a near-imperceptible vibration, no audio, and alarms that disappeared after a few callbacks. `device:os.bg_service` only concerns continuous services. See the [report](../test-reports/2026-10-03-b3-spike-short-session.md).

## Platform constraints (documented)
- The system turns the screen off and exits a mini program about 10 s later. A session page prevents this with `setPageBrightTime` (screen on for the session plus a margin; reset when the page is destroyed) and `pauseDropWristScreenOff` (same duration).
- `setWakeUpRelaunch(true)` reopens the page if the screen still turns off.
- API ceiling is 3.5.

## Modules (planned)
| Module | Role |
|---|---|
| `lib/interval-engine.js` | Pure (B2): `LIMITS`, `DEFAULT_CONFIG`, `LEAD_IN_SECONDS`, `validateConfig`, `totalSeconds`, `buildTimeline`, `buildEvents(timeline, leadInSec)`, `getPosition`, `createSession`, `pauseSession`, `resumeSession`, `stopSession`, `completeSession`, `interruptSession`, `elapsedMs`, `reconcile`. `pendingEvents` and `eventTimeSec` are left from the alarm design and unused. |
| `utils/session-store.js` | Persistence adapter for presets and the active session (versioned JSON, fresh instance per access) |
| `utils/alerts.js` | Vibration patterns (stopped by timer where needed) and one shared audio player |
| `page/gt/*` | Screens (see [session screen](./03-session-screen.md)) |

## Data model
Session (persisted): `schemaVersion`, `id`, `generation`, `config {workSec, restSec, rounds}`, `leadInSec`, `status` (`running`, `paused`, `completed`, `cancelled`, `interrupted`), `originMs` (wall-clock time of timeline second 0), `pausedAtMs` or null, `lastEventIndex` (-1 before the first event).
- `originMs` is always on a whole UTC second (`createSession` rounds the start up) so the tick lands on session seconds.
- `elapsedMs = (pausedAtMs ?? nowMs) - originMs`.
- Timeline phase: `{type: work|rest, round, startSec, endSec}`; a phase covers `[startSec, endSec)`.
- Event: `{index, atSec, kind: warning|start|transition|complete, secondsLeft?, phaseIndex}`; `phaseIndex` is the phase that is ending, -1 for the lead-in; wall time = `originMs + atSec * 1000`. Lead-in events have negative `atSec`. Default session: 54 events, 60 with the 5 s lead-in.
- The vibration and sound for an event depend only on its `kind` (`utils/alerts.js`).
- Position (`getPosition`): `state` (`waiting` before second 0, `active`, `done`), `phaseIndex`, `phase`, `phaseElapsedMs`, `remainingMs`, `displaySec = ceil(remainingMs / 1000)`, `inWarning` (`remainingMs <= 5000`), `totalRemainingMs`.

## Reconciliation
`reconcile(events, lastHandledIndex, elapsedMs, {graceMs, earlyMs})` advances `lastHandledIndex` past every due event and returns at most one event to emit: the latest due event, only if it is within `graceMs` (2000 ms) of its planned time. Older events are skipped silently. Calling it again with the same inputs emits nothing (no duplicates).
- The page tick is scheduled with `setTimeout` for 5 ms after the next whole session second and calls `reconcile` with `earlyMs: 0`. Measured on the GTR 4 (build 7, 15/10 x 3): 30/30 events, lateness 5-18 ms.
- `earlyMs` (default 250 ms) was for alarms that may fire early; it stays in the engine but the page does not use it.

## Pause, resume, stop
1. Every status change (pause, resume, stop, complete, interrupt) increments `generation` and is persisted; invalid transitions return the session unchanged.
2. Pause: store `pausedAtMs` and stop the tick. Resume: `originMs += ceil((now - pausedAtMs) / 1000) * 1000`, clear `pausedAtMs`, restart the tick. Rounding the shift up keeps `originMs` on a whole second; remaining time grows by less than 1 s and never shrinks. Resume with `now < pausedAtMs` (clock moved back) marks the session interrupted.
3. Stop: mark cancelled, stop the tick, sound and vibration.

## Audio and vibration
- One `@zos/media` player per process, created on first use; each sound is `stop()` + `prepare()` and starts on `PREPARE`. Creating a player per sound only played once (B3 build 6).
- `VIBRATOR_SCENE_STRONG_REMINDER` pulses until `stop()`, so it is always stopped by a timer (0.8 s for warnings, 1.5 s for completion).
- Sound file: `assets/gt.*/audio/interval-beep.mp3` (maintainer-provided, 4 beeps, ~4.1 s, MP3 48 kHz 64 kbps), started 3 s before each change.

## Open points
- Battery cost of keeping the screen on for a full session (soak run in the hardware gate).
- Behavior when the app is closed mid-session and reopened (recovery screen), and whether the wake relaunch is needed at all with the screen kept on.
- GTS 4 behavior.

## Failure modes
| Failure | Behavior |
|---|---|
| Tick late beyond grace | Skip the alert, update state silently |
| Sound fails to prepare | Keep vibration, continue |
| App closed mid-session | Persisted session shows Completed or Interrupted on reopen |
| Corrupt or unknown schema | Treat as interrupted |
| Reboot or clock jump | Interrupted; user chooses restart or discard |

## Verified API register
Status values: `documented`, `simulator`, `hardware` (with report link), `excluded`. Update through the `zepp-api-check` skill.

| API | API_LEVEL | Permission | In app service | Status |
|---|---|---|---|---|
| `@zos/alarm` `set`, `cancel`, `getAllAlarms` | 3.0 | `device:os.alarm` | yes | hardware: unreliable for this use (alarms vanished after a few callbacks); not used |
| `@zos/storage` `LocalStorage` | 3.0 | `device:os.local_storage` | not listed | hardware (page writes and reads); an instance caches the file in memory, so use a fresh instance per access |
| `@zos/sensor` `Vibrator` `setMode` + `start` + `stop` (`VIBRATOR_SCENE_DURATION`, `_NOTIFICATION`, `_STRONG_REMINDER`) | 2.0 (scene arrays 3.6) | none listed | near-imperceptible from a service | hardware (page); `SHORT_*` and `DURATION_LONG` barely perceptible |
| `@zos/sensor` `Time` (`getTime` ms UTC) | 2.0 | none listed | yes | hardware |
| `AppService` (single execution) | 3.0 | reference page lists `device:os.bg_service`, which on the GTR 4 opens "Background App Management" and stays unauthorized | n/a | hardware: not used ([report](../test-reports/2026-10-03-b3-spike-short-session.md)) |
| `@zos/media` `create`, Player | 3.0 | none listed | did not play from a service | hardware (page, one shared player); MP3 or recorder OPUS only |
| `@zos/ui` `ARC` | 2.0 | none | no | documented |
| `@zos/ui` `TEXT`, `BUTTON` (`setProperty`) | 2.0 | none | no | hardware |
| `@zos/display` `setPageBrightTime` | 2.0 | none listed | no | hardware: screen stayed on for the whole run |
| `@zos/display` `pauseDropWristScreenOff` | 2.1 | none listed | no | hardware: wrist-down did not turn the screen off |
| `@zos/display` `setWakeUpRelaunch` | 2.0 | none listed | no | hardware: page reopened on wake |
| `@zos/app` `queryPermission`, `requestPermission` | 3.0 | none | no | not used |
| `@zos/app-service` `start` (continuous) | 3.0 | `device:os.bg_service` | n/a | documented, not planned |
| `SystemSounds` | 3.6 | n/a | n/a | excluded |
| Vibrator action arrays | 3.6 | n/a | n/a | excluded |
