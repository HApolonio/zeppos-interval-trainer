# Session Screen Spec

Status: accepted design. Coordinates are 480-based design pixels wrapped in `px()`. The physical GTR 4 screen is 466x466. All numbers must be validated in the simulator and on the watch; round clipping is the main risk.

## Visual language
- Pure black background (AMOLED, battery friendly), large high-contrast digits.
- Phase is shown by text label and color together, never color alone.
- Minimum touch target 64 design px; minimum text size 26.

| State | Color |
|---|---|
| WORK | `0x2ECC71` |
| REST | `0x29B6F6` |
| Warning (last 5 s) | `0xFFB300` |
| Paused | `0x9E9E9E` |
| Track ring / bar | `0x2A2A2A` |
| Text | `0xFFFFFF`, secondary `0xB0B0B0` |

## Navigation
Presets -> Editor -> Session -> Completed. Session <-> Paused. Interrupted appears when stored state cannot be trusted. Settings arrives in v1.1.

## Round layout (GTR 4)
Safe radius about 200 design px from the centre (240, 240). Chord width at distance d from the centre: `2 * sqrt(200^2 - d^2)`.

| Element | Placement | Content |
|---|---|---|
| Track ring | x12 y12 w456 h456, line 14 | background arc |
| Progress ring | same box | remaining fraction, shrinking clockwise from the top (0 deg is 3 o'clock, start = -90 + 360 * elapsedFraction, end = 270); guard empty and full arcs |
| Phase label | y70 h52, size 40 | WORK, REST, PAUSED |
| Time | y150 h140, size 120 | `MM:SS` (a phase is at most 60:00, never hours) |
| Round line | y290 h44, size 34 | `Round 2 / 5` |
| Buttons | y346 h64 | Pause/Resume w100 and Stop w100, gap 8 (208 wide, chord about 210 at the bottom edge) |

## Square layout (GTS 4, proposal)
Device 390x450; design scale 0.8125, so the design height is about 554. No ring (corners are wasted); use a horizontal progress bar. Margin 24.

| Element | Placement | Content |
|---|---|---|
| Phase label | y60 h52, size 40 | WORK, REST, PAUSED |
| Time | y130 h150, size 130 | `MM:SS` |
| Progress bar | x24 y292 w432 h14 | track plus fill |
| Round line | y316 h44, size 34 | `Round 2 / 5` |
| Buttons | y400 h72 | Pause/Resume x24 w204, Stop x252 w204 |

## Behavior
- Displayed value is `ceil(remainingMs / 1000)`, so "5" is shown when the 5th-second alert fires; "00" never appears (the phase changes instead).
- Last 5 seconds: digits and ring/bar turn amber. Phase change swaps label and color immediately and resets the ring/bar.
- Widgets are created once; a tick 5 ms after every whole session second calls `setProperty` only when the displayed text or ring degree changed, and emits the alerts for that second (see [architecture](./02-architecture.md#reconciliation)). The tick is cleared in `onDestroy`.
- Lead-in: after Start, label READY and a 5..1 countdown in the time field, then WORK 1 begins.
- Stop opens the system modal "Stop workout?" (confirm stops, cancel continues). The session keeps running behind the dialog. A back swipe opens the same dialog. Crown and hardware button behavior is not relied upon.
- Paused: label PAUSED, round line shows the paused phase (`WORK 2 / 5`), frozen time, grey ring/bar, Resume button. No auto-expiry in v1.0; Presets shows a resume card. While paused the screen stays on for 60 s only.
- Wake: no `setWakeUpRelaunch`. If the screen turns off and the app exits, the stored session is shown on Presets as Completed or Interrupted (paused ones as Resume).
- Keep screen on (verified on the GTR 4, not configurable): `setPageBrightTime` and `pauseDropWristScreenOff` for the remaining session time plus 10 s, renewed on resume.

## Other screens (v1.0, summary)
- Presets: scrollable cards (name `60/15 x 5`, caption `Total 6:00`); tap opens the editor; "New preset" at the end creates a default preset and opens it. A card on top shows a stored session: Resume (paused), Completed or Interrupted.
- Editor: Work, Rest, Rounds rows with -/+ buttons (see `stepConfigValue`), live total, Start, Delete (below the fold on round screens, confirmed by a modal). Every change is saved at once.
- Result: COMPLETED with Again and Home, or INTERRUPTED with Restart and Discard; the stored session is cleared by any of these buttons.
