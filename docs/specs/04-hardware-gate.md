# Hardware Gate Spec

Purpose: prove on the real watch that session alerts are reliable and clearly perceptible before building the full app. Results are recorded in `docs/test-reports/` (skill `watch-hardware-test`).

## Decision (2026-10-07)
Measured on the GTR 4 ([report](../test-reports/2026-10-03-b3-spike-short-session.md)):

| Approach | Result |
|---|---|
| Background: `@zos/alarm` alarms waking a single-execution app service, screen off | Fail. Vibration from the service near-imperceptible, audio never played, alarms vanished after a few callbacks. `device:os.bg_service` is unrelated (continuous services). |
| Foreground: page keeps the screen on and alerts from a second-aligned tick | Pass on 15/10 x 3: 30/30 events, 0 duplicates, lateness 5-18 ms, every vibration felt, sound heard at all 4 changes with the last beep on the change. |

The maintainer chose the foreground approach: sound first, vibration as support, screen on during the session, no alerts with the app closed. The background spike code (alarm service, alarm param) was removed.

## Spike (temporary app entry `page/gt/spike`)
- **Start**: 5 s lead-in (`READY 5..1`), then `SPIKE_CONFIG` (now the default 60/15 x 5, 60 events with the lead-in). **Stop** ends the run and stops sound and vibration.
- The page keeps the screen on for the session plus 10 s (`setPageBrightTime`, `pauseDropWristScreenOff`; shown as `Keep on <bright>/<wrist> <s>`), ticks 5 ms after each whole session second (`setTimeout`), runs `reconcile` with no early tolerance and alerts through `utils/alerts.js`.
- Sound: `interval-beep.mp3` (4 beeps) starts at every warning with 3 s left (lead-in, every phase end, completion) from one shared player.
- Vibration: strong pulsing (0.8 s) for every warning, notification pattern for start and transitions, strong pulsing (1.5 s) for completion.
- Report (scrolling): volume, keep-on result, fired/duplicates, missing/pending, fired index ranges, lateness min/avg/max, first and last lateness, alerts/sounds/errors, then one line per handled event: `#index kind @seconds-since-origin lateness flags` (`V` vibrated, `SND` sound, `ERR` alert error). Run and log are written to storage at start and end only.

## Remaining acceptance runs (foreground)
Runs 1-4 passed on 2026-10-07 with the previous sound file (see the report); repeat run 2 once with `interval-beep.mp3`.

| # | Scenario | Criterion |
|---|---|---|
| 1 | Default 60/15 x 5 with lead-in, watch worn normally, wrist lowered at times | 60/60 events, 0 duplicates, every alert within 1000 ms, no growing lateness, screen on to the end |
| 2 | Same, all sounds | Sound heard at the start, at every phase change and at completion; last beep on the change |
| 3 | Same, vibration | Strong pattern before work clearly felt; patterns distinguishable; completion stops by itself |
| 4 | Stop mid-session | Sound and vibration stop at once; no later alert |
| 5 | Soak: default session 5 times in a row (about 30 min) | No missing events; battery drop recorded and compared with 30 min idle |
| 6 | Phone Bluetooth off | Same as 1 |

## Metrics
Events planned, fired, missing, duplicate; lateness per event (actual - planned); alert errors; system volume; battery before and after the soak run, compared with an idle period of the same length.

## After the gate
| Result | Action |
|---|---|
| Pass | Proceed to C1 (storage for presets and session recovery) and C2 (screens) |
| Battery cost too high | Report the measured drop; consider dimming or a lower refresh during work phases |
| Sound fails intermittently | Report; vibration stays as the fallback |
