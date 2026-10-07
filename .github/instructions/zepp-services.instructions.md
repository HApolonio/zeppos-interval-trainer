---
description: "Use when writing or changing Zepp OS app services (app-service), alarm callbacks, background alerts, or anything that runs without UI such as vibration, audio or persistence from an alarm."
applyTo: "app-service/**"
---
# Zepp OS app service rules

> v1 has no app service: the hardware gate (2026-10-07) measured near-imperceptible vibration, no audio and lost alarms from alarm-started services. Alerts come from the session page. Read [the gate](../../docs/specs/04-hardware-gate.md) before adding any service.

- Single-execution services are limited to 600 ms. No `setTimeout`/`setInterval`, no `@zos/ui`, no high-power sensors.
- `onInit(params)` receives a string. Parse it defensively and ignore stale payloads (wrong session id or generation).
- Flow: read state -> reconcile -> emit at most one alert -> persist -> schedule -> return. Keep it synchronous and short.
- Only the service emits background alerts. The page must never emit the same alert.
- Alarms use absolute times (`time`, UTC seconds) computed from the session schedule, never from the callback arrival time.
- Log with `@zos/utils` `log.getLogger`. Do not log per-second noise outside the hardware spike.
- Requested permissions stay minimal (`device:os.alarm`, `device:os.local_storage`, `data:os.device.info`). Do not add `device:os.bg_service` unless the hardware gate chooses a continuous service ([hardware gate](../../docs/specs/04-hardware-gate.md)).
- Storage freshness between page and service is an open question until the gate passes: use a fresh `LocalStorage` instance per read-modify-write.
