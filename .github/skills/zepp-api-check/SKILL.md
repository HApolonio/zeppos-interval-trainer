---
name: zepp-api-check
description: 'Use when adding or changing any call to a Zepp OS API (@zos/*), choosing app.json permissions, or deciding whether a feature works on the Amazfit GTR 4 or GTS 4 (API_LEVEL 3.5). Verifies API_LEVEL, permission code, app-service availability and property support against the official docs before code is written.'
argument-hint: 'API or module to verify, e.g. @zos/media create'
---

# Zepp API check

## When to use
- Before importing a new `@zos/*` module or calling a new method or widget property.
- Before adding a permission to `app.json`.
- When a feature must also run inside an app service (no UI, 600 ms limit).

## Procedure
1. Open the official page: `https://docs.zepp.com/docs/reference/device-app-api/newAPI/<module>/<name>/` (UI widgets are under `ui/widget/<NAME>/`). Fetch it with the web tool; do not answer from memory.
2. Record the page-level `API_LEVEL` and the level of every parameter or constant you use. Anything above 3.5 is unavailable on the target watches.
3. Record the permission code shown in the page's INFO box, if any.
4. If the code will run in an app service, check the availability table in `https://docs.zepp.com/docs/guides/framework/device/app-service/`. Timer globals are not available there.
5. For widgets, check the property table to see which fields can be changed with `setProperty`.
6. Add or update the row in the API register in [architecture spec](../../../docs/specs/02-architecture.md#verified-api-register). Status values: `documented` (docs only), `simulator` (seen working in the simulator), `hardware` (measured on the watch, with a report link), `excluded`.
7. If the answer is uncertain or only the hardware can tell, mark it `documented`, add it to the [hardware gate](../../../docs/specs/04-hardware-gate.md) and say so in the reply.

## Output
Report: API, API_LEVEL, permission, service availability, status, and the source URL. State clearly what was verified and what was not.
