---
description: "Turn watch measurements, logs and observations into a test report and evaluate it against the hardware gate"
argument-hint: "Paste the on-watch report, logs and observations"
agent: "agent"
---
Use the `watch-hardware-test` skill.

Create the report in `docs/test-reports/` from the pasted data using [the template](../skills/watch-hardware-test/references/report-template.md). Compute the timing table and summary (planned, fired, missing, duplicate, max and average lateness). Evaluate against [the hardware gate](../../docs/specs/04-hardware-gate.md), state pass, fail or inconclusive, and update the status in [the plan](../../docs/PLAN.md). Do not infer anything that was not measured. The report is in English; the reply to the maintainer is in pt-PT.
