# Interval Trainer - Project Guidelines

Work/rest interval timer for Zepp OS watches. Primary device: Amazfit GTR 4 (round, 466x466). Also targeted: Amazfit GTS 4 (square, 390x450). Watch-only, offline, no companion phone app.

## Language
- All project files (code, comments, docs, commit messages) are written in English.
- Chat replies to the maintainer are in European Portuguese (pt-PT).

## Source of truth
- Status, milestones and decisions: [docs/PLAN.md](../docs/PLAN.md)
- Normative specs: [docs/specs/](../docs/specs/) (product, architecture, session screen, hardware gate, roadmap)
- Tooling and troubleshooting: [docs/DEV-SETUP.md](../docs/DEV-SETUP.md)
- When a decision changes, update the matching spec and the status in `docs/PLAN.md` in the same change.

## Environment (verified by the maintainer)
- Windows, PowerShell. Node 24.20, npm 11.19, Zeus CLI 1.9.3, Zepp OS Simulator 2.1 with GTR 4 device (OS 3.5, API level 3.5). The real watch reports API_LEVEL 305.
- Commands: `npm test` (pure logic, `node:test`), `zeus dev` (simulator), `zeus preview` (QR install on watch), `zeus build` (package in `dist/`). `package.json` wraps them as `npm run dev|preview|build`.
- Do not use `zeus create` flags such as `--APILevel`, `--withAppSide`, `--withSettings`: the template list is empty in Zeus 1.9.3.

## Hard constraints
- Never use APIs above API_LEVEL 3.5. `SystemSounds`, vibration action arrays and `Time.onPerHourEnd` need 3.6 and are unavailable. Keep `minVersion` and `compatible` at 3.0 unless a feature requires more.
- Before using any `@zos/*` API, verify its API_LEVEL, permission code and service availability (skill `zepp-api-check`).
- Alerts come from the open session page, which keeps the screen on (`setPageBrightTime`, `pauseDropWristScreenOff`) and ticks with `setTimeout` just after each whole session second. Do not use `@zos/alarm` or app services for alerts: the hardware gate measured near-imperceptible vibration, no audio and lost alarms (see `docs/specs/04-hardware-gate.md`).
- Timekeeping is deadline-based: durations are whole seconds and state stores absolute timestamps. The tick derives everything from `reconcile` and `getPosition`; it never decrements counters.
- Use one shared `@zos/media` player per process, and always stop `VIBRATOR_SCENE_STRONG_REMINDER` with a timer (see `utils/alerts.js`). Never change the system volume.
- Do not keep state in `getApp().globalData` or a cached `LocalStorage` instance; use a fresh instance per access.
- Layouts use `px()` on a 480 design width with separate layout files per screen shape (`r`, `s`). Never hard-code 466 or 390.
- Do not add dependencies (for example `@zeppos/zml`) without a recorded need.
- Hardware behavior (alerts, vibration, audio, screen keep-on, persistence, battery) is unverified until measured on the watch. Never state that it works without a report in `docs/test-reports/` (skill `watch-hardware-test`).
- Do not commit, push or create branches unless the maintainer asks.

## Planned layout
```
lib/          pure logic, no @zos imports, unit-tested
utils/        Zepp adapters (storage, alerts) and the template helper utils/index.js
page/gt/<screen>/index.page.js + index.page.r.layout.js + index.page.s.layout.js
assets/gt.r, assets/gt.s   resources per screen shape (images, audio)
tests/        *.test.mjs run with node --test
docs/         PLAN.md, DEV-SETUP.md, specs/, test-reports/
```
