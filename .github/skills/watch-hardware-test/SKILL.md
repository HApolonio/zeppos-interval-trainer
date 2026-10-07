---
name: watch-hardware-test
description: 'Use when planning, running or documenting tests on the real Amazfit GTR 4 or the simulator: screen-off alerts, alarm timing accuracy, vibration, audio, persistence, pause/resume, battery. Produces a test report in docs/test-reports and decides pass or fail against the hardware gate.'
argument-hint: 'Test topic, e.g. default 60/15/5 session with screen off'
---

# Watch hardware test

## When to use
- Running a milestone from the [hardware gate](../../../docs/specs/04-hardware-gate.md).
- Turning logs or the maintainer's observations into a report.
- Deciding whether a feature may be called working.

## Procedure
1. Read the acceptance criteria in the hardware gate spec and pick the scenarios to run (screen on, wrist down, manual screen-off, other watch face, phone disconnected).
2. Prepare the build: `zeus preview` and scan the QR code with Zepp App > Profile > watch > Developer Mode > Scan. Use the simulator only for layout and logic, never as proof of vibration, audio or screen-off behavior.
3. Ask the maintainer to run the scenarios and report: planned vs actual times from the on-watch report screen, what was felt or heard, battery before and after, and any error shown. Real device logs are viewed in the Zepp App Developer Mode.
4. Write the report from [the template](./references/report-template.md) to `docs/test-reports/YYYY-MM-DD-<topic>.md` (English). Include watch firmware, API_LEVEL, app version and build.
5. Evaluate against the criteria and state pass, fail or inconclusive. Never infer hardware behavior that was not measured.
6. Update the status in [docs/PLAN.md](../../../docs/PLAN.md) and the API register status (`hardware`) when applicable.
