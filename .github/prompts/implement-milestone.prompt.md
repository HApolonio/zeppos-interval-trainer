---
description: "Implement a milestone from docs/PLAN.md following the specs, with tests and a status update"
argument-hint: "Milestone id, e.g. B2 (default: next not-started item)"
agent: "agent"
---
Implement the requested milestone (or the next not-started one) from [the plan](../../docs/PLAN.md).

1. Read the plan status, the relevant specs in [docs/specs](../../docs/specs/) and [the project guidelines](../copilot-instructions.md). Respect the hardware gate: do not build features that depend on unmeasured behavior until its report passes.
2. State the smallest vertical slice you will deliver, then implement it. Reuse existing code; add no dependencies or unrelated refactors.
3. Verify any `@zos/*` API first with the `zepp-api-check` skill.
4. Add or update tests for pure logic and run `npm test`. Run `zeus build` when UI or config changed.
5. Update the milestone status and decisions in `docs/PLAN.md` and the affected spec.
6. Report in pt-PT: what was done, what was verified, what still needs the real watch. Do not commit or push.
