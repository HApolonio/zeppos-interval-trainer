# Product Spec

Status: proposed and accepted by the maintainer on 2026-10-02 unless marked otherwise. Revised on 2026-10-07 after the hardware gate: foreground session with the screen on, sound in 1.0.

## Summary
Offline interval timer for Zepp OS watches. The user picks or edits a preset (work seconds, rest seconds, rounds), starts it, and gets sound, vibration and visual cues until completion. The app stays open with the screen on for the whole session.

Motivation: the interval apps tried from the Zepp store vibrate too faintly, especially with the screen off, and offer no sound option. Clearly audible and perceptible alerts are the reason this app exists. The hardware gate showed that alerts from the background (screen off) are near-imperceptible and silent on the GTR 4, so the maintainer chose a foreground session: sound first, vibration as support, screen kept on (sessions are short).

## Configuration
| Field | Type | Range | Default |
|---|---|---|---|
| `workSec` | integer seconds | 6..3600 | 60 |
| `restSec` | integer seconds | 6..3600 | 15 |
| `rounds` | integer | 1..99 | 5 |

- The 6 second minimum guarantees a full 5-second warning window inside every phase.
- Total duration = `rounds * workSec + (rounds - 1) * restSec`. There is no rest after the last work phase. A one-round session has no rest. Show the total before starting.
- Default session: W60 R15 W60 R15 W60 R15 W60 R15 W60 = 360 s (9 phases).
- Only one session can be active. Editing a preset never changes a running session (the session stores a snapshot of the configuration).

## Session flow
`ready -> lead-in -> running (work/rest) <-> paused -> completed`, plus `cancelled` (user stopped) and `interrupted` (app closed during a session, reboot, corrupt state, clock change; needs an explicit user choice).
- Start begins a 5 s lead-in countdown ("READY 5..1") so the start sound can play before the first work phase.
- During the session the app keeps the screen on and ignores wrist-down screen-off until the session ends plus a short margin.
- Pause freezes the remaining time. Resume shifts all later deadlines by the paused duration rounded up to a whole second (keeps ticks on whole session seconds), so the remaining time can grow by less than 1 s and never shrinks.
- Stop asks for confirmation, then ends the session and stops any sound or vibration.
- No cooldown phase in v1.

## Alerts
- For every phase end: warning events at 5, 4, 3, 2, 1 seconds remaining, then one transition event at 0 (next phase is work or rest). The lead-in uses the same countdown and ends with a start event.
- The last phase uses the same countdown and ends with a completion event instead of a transition.
- Sound (v1.0, primary): a bundled 4-beep MP3 starts 3 s before every phase change, the start and the completion, so its last beep lands on the change. Played with `@zos/media` from the page. Never change the system volume.
- Vibration (v1.0, support): every warning (lead-in, work and rest) uses the strong pulsing pattern for 0.8 s; start and transitions use the notification pattern; completion uses the strong pattern for 1.5 s.
- v1.1 settings (`Settings` card on Presets, stored locally, applied when a session starts): Sound (countdown beeps), Vibration (all pulses), 5-1 s vibration (only the countdown pulses; start, transition and completion still vibrate). All default to on. The screen is always kept on during a session: tested on the GTR 4, a session with the screen allowed to sleep is lost when the wrist is raised (the app does not come back).
- A late tick never replays old warnings: only the latest due event inside the grace window is emitted (see [architecture](./02-architecture.md#reconciliation)).

## Presets
- The default preset `60/15 x 5` is seeded when nothing is stored (and restored if the last preset is deleted). Users can create, edit and delete presets, limit 20.
- Names are generated from the values (for example `60/15 x 5`). Custom names need a phone companion and are out of scope for v1.
- Stored locally, versioned (`schemaVersion`), no cloud. Removed when the app is uninstalled.

## Recovery rules
- Alerts only happen while the app is open. If the app is closed during a session (back button, another app, system exit), the session is not continued in the background.
- On reopen, state is rebuilt from stored deadlines. If the session would have finished meanwhile, show "Completed"; otherwise show "Interrupted" with Restart and Discard. Never resume a workout automatically.
- After reboot, corrupt data or a time discontinuity, show "Interrupted" with Restart and Discard.
- If the sound cannot be prepared, keep the vibration and continue.

## Out of scope for v1
Sets, named exercises, warm-up and cool-down, alerts with the app closed or the screen off, native sports workout integration, heart-rate or GPS, cloud sync, phone settings app, custom sounds, localization other than English UI.

## Supported devices
| Device | Screen | Status |
|---|---|---|
| Amazfit GTR 4 | round 466x466 | primary, API level 3.5 verified |
| Amazfit GTS 4 | square 390x450 | secondary, layout proposed, API level and behavior to be verified |
