# Interval Trainer - Plan and Status

Snapshot date: 2026-10-07. Update this file at the end of every working session (prompt `update-handoff`). Normative requirements live in [specs](./specs/); this file tracks status, decisions and history.

## Goal
A work/rest interval timer (Tabata style) for Amazfit watches: configurable work duration, rest duration and repetitions, with clearly audible sound and perceptible vibration in the last 5 seconds before every phase change. The app stays open with the screen on during a session (decided after the hardware gate). Primary device Amazfit GTR 4, secondary Amazfit GTS 4 (square).

## Status
| Id | Milestone | Status | Notes |
|---|---|---|---|
| A1 | Node, npm, Zeus installed | done | Node 24.20, npm 11.19, Zeus 1.9.3, zpm 3.4.2 (verified by maintainer) |
| A2 | Simulator installed | done | Simulator 2.1 with GTR 4 device, OS 3.5, API level 3.5 |
| A3 | Developer Mode and API_LEVEL | done | Zepp Android app reports API_LEVEL 305 (read as 3.5) |
| A4 | `zeus login`, simulator preview, QR install | done | Simulator preview and QR install on the GTR 4 confirmed by the maintainer (2026-10-02) |
| B1 | Scaffold this repository | done | `app.json` (appId 1129777, name, 0.1.0, `device:os.alarm`), `package.json` scripts, `package-lock.json` tracked, `@zeppos/zml` removed; `npm test` and `zeus build` pass; no commits yet |
| B2 | Pure interval engine and tests (`lib/`) | done | `lib/interval-engine.js` with lead-in events and `alertKind` (2026-10-07); used by the spike page. Spec: [architecture](./specs/02-architecture.md) |
| B3 | Hardware spike | in progress | Background approach (alarms + app service) failed: near-imperceptible vibration, no sound, alarms lost. Foreground build 7 (15/10 x 3): 30/30 events, 0 duplicates, lateness 5-18 ms, every vibration felt, sound at all 4 changes. Foreground chosen (2026-10-07); background code removed. Default session 60/15 x 5 with lead-in (build 8): 60/60, 0 duplicates, lateness 5-23 ms, 10 sounds, Stop silences at once. Remaining: one run with the new sound, soak with battery, Bluetooth off. [Report](./test-reports/2026-10-03-b3-spike-short-session.md). Gate: [hardware gate](./specs/04-hardware-gate.md) |
| B4 | Audio probe with `@zos/media` | done | MP3 plays from the page with one shared player and lines up with the phase change; did not play from an app service |
| C1 | Storage for presets and session recovery | not started | No alarms or service; needs B2 |
| C2 | Screens: presets, editor, session, completed | not started | Session screen reuses the spike tick, alerts and keep-screen-on; round and square layouts |
| C3 | Settings (v1.1) | not started | Sound/vibration/warning toggles; needs C1 |
| D1 | Full test pass, README, release 1.0 | not started | |

## Decision log
| Date | Decision |
|---|---|
| 2026-10-02 | Name: Interval Trainer. Separate repository; the original sample `zeppos-timer-app` is kept untouched as reference. |
| 2026-10-02 | v1 scope: repeating work/rest only (no sets, no exercise sequences). Default 60 s work, 15 s rest, 5 rounds, no rest after the last work phase (6:00 total). |
| 2026-10-02 | Alerts at 5, 4, 3, 2, 1 seconds before every phase end, plus a distinct transition alert; the final phase also counts down and ends with a completion alert. |
| 2026-10-02 | Must work with the screen off; checked in the hardware gate. Native sports workouts and leaving the app are out of the first acceptance scope. |
| 2026-10-02 | Sound by playing bundled audio files with `@zos/media` (enables selectable sounds later). Vibration is the v1.0 alert and the fallback. Sound and vibration become independently configurable in v1.1. |
| 2026-10-02 | API ceiling 3.5 (watch reports 305). `SystemSounds` and vibration action arrays (3.6) are excluded. |
| 2026-10-02 | No phone companion or settings app in v1. Presets are local and auto-named. |
| 2026-10-02 | Keep both round and square platforms (template target `gt`, assets `gt.r` and `gt.s`) to support GTS 4. |
| 2026-10-02 | Do not use `zeus create` flags; reuse the generated hello-world scaffold. |
| 2026-10-02 | B1: appId 1129777 (registered to the maintainer in the Zepp Developer Console, confirmed by the maintainer), vendor "Hugo Apolónio", version 0.1.0 (code 1). Permissions: device info (used by layouts), local storage, `device:os.alarm` (verified in docs, API_LEVEL 3.0). |
| 2026-10-02 | `npm test` runs `node --test` with its default file patterns (picks up `tests/*.test.mjs`) so it passes with zero tests. `package-lock.json` is committed. |
| 2026-10-02 | The spike page and alarm service are registered in `app.json` together with their files in B3, not in B1, so the build never references missing files. |
| 2026-10-02 | B2: `originMs` is kept on a whole UTC second (start rounded up, resume shift rounded up) so alarm times in seconds are exact; remaining time after resume can grow by < 1 s, never shrink. Product and architecture specs updated. |
| 2026-10-02 | B2: `reconcile` treats an event as due up to `earlyMs` (250 ms) before its planned time; `graceMs` stays 2000 ms. Both are tuned after B3. Every status change bumps `generation`; invalid transitions return the session unchanged; resume with the clock moved back marks the session interrupted. |
| 2026-10-02 | `package.json` has `"type": "module"` so `node:test` loads `lib/*.js` as ES modules without warnings; `zeus build` still passes. |
| 2026-10-02 | License: ISC (`LICENSE` at the root, matches `package.json`), confirmed by the maintainer. Public `README.md` added. |
| 2026-10-02 | B3 spike: the spike page is the temporary app entry; all alarms of a run are registered up front to measure capacity; `device:os.bg_service` is not requested (single execution should not need it); if the service never runs on the watch, add it and re-test. |
| 2026-10-03 | B3 spike temporarily uses `SPIKE_CONFIG` 15/10 x 3 (65 s, 30 events) to shorten watch runs, at the maintainer's request. The product default stays 60/15 x 5; switch `SPIKE_CONFIG` back to it for the final acceptance runs. |
| 2026-10-03 | B3 build 5: `device:os.bg_service` removed (the system treats it as continuous-service management; no effect on single execution). Spike alarms use `store: true`. The spike page no longer polls storage every second. |
| 2026-10-04 | Maintainer request: bring the audio probe (B4) forward and also try a foreground mode, where the page keeps the screen on for the whole session (`setPageBrightTime`, `pauseDropWristScreenOff`) and alerts itself from a 250 ms tick, with no alarms. Spike build 6 offers BG (alarms + service) and FG side by side; sound plays at 3 s left (last of 4 beeps lands on the change). The system volume is never changed. |
| 2026-10-07 | Hardware gate decision (maintainer): foreground only. The session page keeps the screen on and emits all alerts; no `@zos/alarm`, no app service, no alerts with the app closed. Sound is the primary alert in v1.0, vibration supports it. `device:os.alarm` permission, the app service and `lib/alarm-param.js` removed. This supersedes the 2026-10-02 screen-off requirement and the vibration-only v1.0. |
| 2026-10-07 | Maintainer requests: a 5 s lead-in with the start sound before work 1 (`LEAD_IN_SECONDS`, events with negative `atSec`, `start` kind); warnings before work (lead-in and rest) use the strong pulsing pattern of the completion, stopped after 0.8 s. Spike tick aligned to whole session seconds (lateness 5-18 ms). `SPIKE_CONFIG` back to the default 60/15 x 5 for the acceptance runs. `tests-images/` is ignored by git. |
| 2026-10-07 | After build 8: every warning (work and rest) uses the strong pattern for 0.8 s (`alertKind` removed). Sound replaced by the maintainer's `assets/gt.*/audio/interval-beep.mp3`; the Pixabay file was deleted. |

## Open questions and unverified assumptions
- Battery cost of a full session with the screen kept on (soak run).
- Recovery when the app is closed mid-session (product rule: Interrupted or Completed on reopen) is not implemented yet (C1/C2).
- `interval-beep.mp3` (MP3, 48 kHz, 64 kbps, ~4.1 s) was provided by the maintainer; confirm it is own work or CC0 before publishing. `assets/gt.r/audio/interval-beep.m4a` (its source?) is not playable on the watch and is bundled into the package while it stays under `assets/`.
- GTS 4 API level and simulator layout; the square layout is a proposal until tested.

## Existing sample (`zeppos-timer-app`) findings
- It manages independent timers; it has no work/rest sequence, no pause/resume and no explicit audio.
- Countdown display recomputes from a target timestamp and repaints with `setInterval(1000)` but recreates widgets every tick and has no interval cleanup.
- `app-service/index.js` posts a notification with vibration when an alarm fires. `app-service/delay.js` is not registered in `app.json` and only schedules one alarm; it is not a keep-alive loop.
- Saved "timers" are reusable durations; do not read them as wall-clock alarms. Its `Date`-based duration math and string-encoded storage must not be reused.
- Its `designWidth` 480 is a coordinate reference, not the GTR 4 resolution (466x466).
- Reusable ideas: alarm registration pattern with `@zos/alarm`, `LocalStorage` usage, button and picker widgets.

## Next step
Run the remaining foreground gate scenarios on the GTR 4 (default 60/15 x 5 with lead-in, sound and strong rest warnings, Stop mid-session, soak with battery) via `npm run preview`, then start C2 with the session screen built on the spike's tick and alerts. See [hardware gate](./specs/04-hardware-gate.md#remaining-acceptance-runs-foreground).

## Official sources used
- https://docs.zepp.com/docs/reference/related-resources/device-list/
- https://docs.zepp.com/docs/guides/quick-start/
- https://docs.zepp.com/docs/guides/tools/cli/
- https://docs.zepp.com/docs/guides/tools/zepp-app/
- https://docs.zepp.com/docs/guides/best-practice/debug/
- https://docs.zepp.com/docs/guides/framework/device/app-service/
- https://docs.zepp.com/docs/guides/framework/device/screen-adaption/
- https://docs.zepp.com/docs/guides/framework/device/compatibility/
- https://docs.zepp.com/docs/reference/device-app-api/newAPI/alarm/set/
- https://docs.zepp.com/docs/reference/device-app-api/newAPI/storage/localStorage/
- https://docs.zepp.com/docs/reference/device-app-api/newAPI/sensor/Time/
- https://docs.zepp.com/docs/reference/device-app-api/newAPI/sensor/Vibrator/
- https://docs.zepp.com/docs/reference/device-app-api/newAPI/media/
- https://docs.zepp.com/docs/reference/device-app-api/newAPI/ui/widget/ARC/
- https://docs.zepp.com/docs/reference/device-app-api/newAPI/display/setPageBrightTime/
