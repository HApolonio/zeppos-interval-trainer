# Roadmap

Versions and the exit criteria for each. Milestone ids refer to [docs/PLAN.md](../PLAN.md).

| Version | Goal | Scope | Exit criteria |
|---|---|---|---|
| 0.1 (internal) | Prove the foundation | Scaffold (B1), engine and tests (B2), hardware spike (B3), audio probe (B4) | [Hardware gate](./04-hardware-gate.md) passed or alternatives chosen (foreground chosen on 2026-10-07) |
| 1.0 | Usable training timer | Presets, editor, session with 5 s lead-in, pause/resume/stop, sound at every change, vibration at 5-1 and changes, screen kept on, completed and interrupted screens, round and square layouts, English UI | All unit tests pass; `zeus build` succeeds; foreground gate runs pass on the GTR 4 (default session, soak with battery); presets survive reopen |
| 1.1 | Settings | Independent sound/vibration/warning toggles, keep-screen-on toggle, settings screen | Toggles persist; volume untouched by default |
| 1.2 | Personalization | Sound choice per event (warning, work start, rest start, finish), vibration pattern choice | Sounds licensed (own or CC0); selection persists |
| 1.3 | Fuller workouts | Warm-up and cool-down, sets/blocks with rest between sets, configurable warning seconds | Engine extended with tests; spec updated first |
| 2.0 | Sequences | Named exercise steps with their own durations; phone companion for naming, import and export | Needs Side Service and settings app; new spec |
| 2.x | Extras | History and stats, heart-rate display, compact always-on view, custom sounds transferred from the phone, pt-PT and other languages | Each item gets its own spec and gate |

## Release 1.0 checklist
- [x] `app.json`: real `appId`, version 1.0.0, only needed permissions (device info, local storage)
- [x] README with install, usage and known limitations
- [ ] Reports for every gate scenario in `docs/test-reports/`
- [ ] GTS 4 layout checked in the simulator (and on hardware if available)
- [x] License and attribution reviewed (no code adapted from the sample)
- [x] Bundled sound licensed for redistribution (own work)
- [ ] Store icon 240x240 and 3+ screenshots 360x360; texts in [store-listing](../store-listing.md)
