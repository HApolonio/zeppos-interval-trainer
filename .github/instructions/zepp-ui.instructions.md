---
description: "Use when writing or changing Zepp OS pages, widgets, layout files or UI assets for round (GTR 4) and square (GTS 4) screens. Covers px scaling, safe areas, widget updates, timers and wake behavior."
applyTo: "page/**"
---
# Zepp OS UI rules

- Every page has `index.page.js` plus both `index.page.r.layout.js` and `index.page.s.layout.js`, imported with `zosLoader:./index.page.[pf].layout.js`.
- Wrap design values with `px()` (480 design width). Never wrap values from `getDeviceInfo()`; combine them as `width - px(20)`.
- Round screen: keep content inside a safe radius of about 200 design px from the centre and check the chord width of every row. Square screen: device is 390x450 but coordinates are still 480-based, so use `DEVICE_HEIGHT` for vertical placement.
- Create widgets once in `build()` and update them with `setProperty`, only when the displayed value changed. Do not delete and recreate widgets every tick.
- Clear every timer (`setTimeout`/`setInterval`) in `onDestroy`, and stop sound and vibration there.
- The session page owns alerts: its tick is a `setTimeout` chain 5 ms after each whole session second, it calls `reconcile` (no early tolerance) and alerts through `utils/alerts.js`. Other pages never emit alerts.
- During a session keep the screen on with `setPageBrightTime` and `pauseDropWristScreenOff` (remaining time plus a margin). Otherwise the system turns the screen off and exits the app about 10 s later. Pages must rebuild fully from persisted deadlines, before the first paint.
- Colors, sizes and states come from [session screen spec](../../docs/specs/03-session-screen.md). Phase must never be conveyed by color alone.
- Put images and audio in `assets/gt.r` and `assets/gt.s`; keep identical file names in both.
- Visible strings are English in v1.
