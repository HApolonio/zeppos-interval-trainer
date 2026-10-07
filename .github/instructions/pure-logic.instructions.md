---
description: "Use when writing or changing the interval engine, validation, scheduling math or unit tests. Pure JavaScript with injected clock, tested with node:test."
applyTo: ["lib/**", "tests/**"]
---
# Pure logic and tests

- `lib/` never imports `@zos/*`. Time is passed in as millisecond numbers (`nowMs`); never read the clock inside the engine.
- Durations are whole seconds; timestamps are absolute milliseconds. State updates are immutable (return a new object).
- Tests live in `tests/*.test.mjs` and use `node:test` with `node:assert/strict`. Run with `npm test`.
- Cover boundaries explicitly: first and last millisecond of every phase, exact warning times, one-round sessions (no rest), pause inside a warning window, resume deadline shift, late callbacks that cross several phases, duplicate handling and invalid configuration.
- Specs: [architecture](../../docs/specs/02-architecture.md) and [product](../../docs/specs/01-product.md). Change the spec first if behavior changes.
