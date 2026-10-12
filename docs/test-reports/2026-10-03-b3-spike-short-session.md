# Test report: B3 alarm spike, short session (15/10 x 3)

- Date: 2026-10-03
- App version / build: 0.1.0, spike builds 1 and 2 (local, `npm run preview`)
- Device: Amazfit GTR 4, firmware 7.6.0.2, API_LEVEL 305
- Phone / Zepp app version: Android 13 (MIUI 14), Zepp app with Developer Mode
- Tester: maintainer

## Goal
First look at the [hardware gate](../specs/04-hardware-gate.md) criteria with a short session: alarm registration, alarms firing with the screen off, vibration from the app service, storage between service and page.

## Setup
`SPIKE_CONFIG` 15 s work, 10 s rest, 3 rounds: 30 events over 65 s. Start pressed on the spike page, then the screen was left to turn off by itself. Battery not measured.

## Scenarios and results
| # | Scenario | Expected | Observed | Result |
|---|---|---|---|---|
| Build 1 | Start, screen turns off by itself | Warnings at 10-14 s, transition at 15 s, and so on until 65 s | One faint vibration near 15 s, nothing after. App closed when the screen went off (documented system behavior). Report screen not read | inconclusive |
| Build 2, page demo | Tap through the three patterns with the app open | Each pattern clearly felt | Warning (`DURATION`) clearly felt; transition (`STRONG_REMINDER`) clearly felt but kept pulsing for a while; completion (`DURATION_LONG`) very weak, probably because the previous pattern was still running | partial |
| Build 2, run | Start, screen turns off by itself | 30 events fired and felt | Only one very soft vibration felt with the screen off. Report below: 5 of 30 fired | fail |
| Build 3, page demo | Tap the title through the three patterns (with `stop()` first) | Each pattern clearly felt | Warning (`DURATION`) and transition (`NOTIFICATION`) clearly felt; completion (`DURATION_LONG`) still barely perceptible | partial |
| Build 3, permission | Start requests `device:os.bg_service` | Asked once | System dialog shown and accepted, but every later Start asked again (`queryPermission` apparently still 0) | fail |
| Build 3, run | Start, accept dialog, screen off | 30 events fired and felt | After the first (very subtle) vibration the page showed IDLE, so the run had disappeared from storage; no vibration for the rest of the run. Numbers not available | fail |
| Build 4, permission | Request `device:os.bg_service` when the page opens | Authorized | Accepting opens "Background App Management: There are no applications that use this permission"; back returns to the app. `queryPermission` 0, request result 0 | fail (not applicable to single-execution services) |
| Build 4, run | Start with the page open | Run persists | About 15 s after Start: `RUN LOST`, `Log -`, `Sys alarms 0`: run, log and all 30 alarms gone at once | fail |
| Build 6, FG (2026-10-07) | Foreground run, screen kept on, wrist lowered at times | Screen on to the end, every alert felt and heard | Screen stayed on. Every vibration felt. Sound played only in round 1 (3 s before the end of work 1), and its last beep matched the work-to-rest change. Completion vibration (`STRONG_REMINDER`) never stopped until the app was closed. Report: `Vol 61`, `Fired 26 dup 0 miss 4`, missing indexes 8, 14, 20, 26, late 8/115/255 ms | partial |
| Build 6, BG (2026-10-07) | Alarm run, screen off by wrist down | Sound and clear vibration with the screen off | No sound at all; only one almost imperceptible buzz. The title stayed `STARTING` (the page no longer refreshes by itself; the title was not tapped). The screen turned off and on with the wrist; after about 1:30 the app was gone (documented exit). Numbers not collected | fail |
| Build 7, FG (2026-10-07) | Foreground run, shared player, second-aligned tick | 30/30, sound at every change, completion stops | `Fired 30 dup 0 miss 0`, `Idx 0-29`, late 5/9/18 ms (first 18, last 6), 30 vibrations, 0 errors. Sound at all 4 changes, last beep on the change. Completion vibration stopped by itself | pass |
| Build 8, FG default 60/15 x 5 (2026-10-07) | Lead-in 5 s, strong warnings before work, gate runs 1-4 | 60/60, sound at start, every change and completion; Stop silences at once | `Keep on 0/0 376s`, `Fired 60/60 dup 0`, `Miss 0 pending 0`, `Idx 0-59`, late 5/10/23 ms (first 5, last 6), 60 alerts, 10 sounds, 0 errors. Strong pre-work vibration liked; Stop stopped the sound mid-play | pass |

## Timing data
Build 2 report screen: `DONE`, `Alarms 30 ok 0 fail`, `Fired 5 dup 0 miss 25`, `Pending 0 sys 0`, `Late 41/41/41 ms`, `Drift 41 > 41 ms`, `Vibr 5 svc 107 ms`, `Err 0 stale 0 bad 0`.

Summary: 30 planned and registered, 5 fired (indexes not recorded by build 2), 25 missing, 0 duplicates, lateness 41 ms on every fired event, max service time 107 ms. All 30 alarms had left `getAllAlarms()` by the end.

## Subjective observations
- 20 ms scenes (`SHORT_STRONG`) are barely perceptible.
- Vibration started from the service felt much weaker than the same pattern started from the page. Possibly the vibration stops when the 107 ms service execution ends (not proven).
- The report text was hard to read near the round edge and could not be scrolled.

## Battery
Not measured.

## Conclusion
Fail for scenario 2. Registering 30 alarms works, and fired alarms are accurate (41 ms) and fast (107 ms in the service). But 25 of 30 alarms did not reach the service, and service vibration is weak. Hypotheses to test next:
1. Alarms only start the service while the app is alive, or need `device:os.bg_service`. Build 3 requests it, shows its status (`bg perm`), records when the page is destroyed (`Page exit`) and lists every callback with its index and time.
2. Vibration is cut short when the single execution ends. If build 3 confirms it, evaluate a notification with vibration (gate fallback) before any other approach.

Build 3 also stops the previous vibration before starting a new one, uses `NOTIFICATION` for transitions, and makes the report scrollable.

### Build 3 follow-up
The run vanished right after Start, while the permission dialog was involved. Likely causes: the dialog interrupted the page before its storage writes were persisted, or storage was overwritten by another writer. With no run, the service treats every callback as stale and does not vibrate, which matches the silent rest of the run. Build 4:
- requests the permission once when the page opens, never on Start, and shows the query value plus the raw request result (`bg perm 0 req [...]`);
- shows `RUN LOST` (instead of IDLE) when a run seen earlier is no longer in storage, with the log entry count;
- lets the service recreate a missing log (`NEW`) so callbacks are still counted;
- uses `STRONG_REMINDER` for completion (it was the clearest pattern; it pulses for a while).

### Build 4 follow-up
`device:os.bg_service` only concerns continuously running services (the system lists no app using it) and is removed again. Around 15 s, which is about when the first callbacks run and when the screen times out, storage and every alarm of the app were empty at the same moment. In build 2 the alarms also disappeared after 5 callbacks. Hypotheses:
1. Alarms set without `store: true` are dropped when the app process ends or restarts. Build 5 sets `store: true`.
2. The page's per-second `LocalStorage` instances raced with the service writes (an instance caches the file and may write it back). Build 5 reads storage only on open, Start, Stop and title tap, and writes run and log once after all alarms are registered.
3. The app is relaunched by the alarm or by the system. Build 5 logs `app onCreate` / `app onDestroy` with their options, and logs every page render.
The simulator Console (or Zepp App Developer Mode logs) is needed to confirm which one.

### Build 6 follow-up
- FG: the four missing indexes (8, 14, 20, 26) are exactly the later "3 s left" events, where the sound is started. The vibration for them was felt, but no log entry was written, so the alert threw right after vibrating, when a new player was created. Build 7 reuses one player for the whole process (`stop()` then `prepare()`), and catches alert errors into the entry (`ERR`).
- FG lateness grew from 8 to 255 ms within each phase because a free-running 250 ms interval drifts against the session seconds. Build 7 schedules each tick with `setTimeout` for 5 ms after the next whole session second.
- `STRONG_REMINDER` pulses until `stop()`. Build 7 stops it after 1.5 s in the page; the service (which cannot stop it later) uses the transition pattern for completion.
- BG: with the screen off, service vibration is close to imperceptible and service audio did not play. Together with the earlier alarm losses, alerts from the alarm-started service do not meet the gate. FG met the vibration and screen criteria and only needs the fixes above.

### Decision after build 7
The maintainer chose the foreground approach (sound first, vibration as support, screen on during short sessions) and asked for a start sound before work 1 and the strong completion pattern on the warnings before work. Background code was removed; the remaining acceptance runs are listed in the [hardware gate](../specs/04-hardware-gate.md#remaining-acceptance-runs-foreground).

### After build 8
The default-session run passed gate runs 1-4. The maintainer asked for the strong pattern on every warning (also before rest) and replaced the sound with `interval-beep.mp3`; the old Pixabay file was removed. Pending: one run with the new sound, the soak with battery, and the Bluetooth-off run.

## Production session soak follow-up (2026-10-12)

- App version / build: 1.0 release context; installed version and build not reported.
- Device: Amazfit GTR 4 (confirmed by the maintainer). Firmware, API_LEVEL and phone / Zepp app version not reported for this run; do not assume the earlier metadata applies.
- Tester: maintainer.
- Goal: foreground gate scenario 5, five consecutive default sessions with sound and vibration enabled.
- Setup: (60 s work / 15 s rest x 5 rounds) x 5 executions, approximately 30 minutes, app in the foreground with its screen kept on.

| Scenario | Expected | Observed | Result |
|---|---|---|---|
| Five consecutive default sessions | No missing alerts; record battery consumption and a comparison | All alerts fired with consistent intensity throughout; battery 53% to 51% | pass (maintainer observation) |
| Approximately 30-minute reference | Record a baseline | Always-on watch face showing the time, native timer running in the background to signal the end; reported battery consumption approximately 0.5 percentage points | recorded; not an equivalent full-brightness screen baseline |

### Timing and alert evidence

Five sessions with the 5 s lead-in plan 300 events and 50 countdown sound sequences. The maintainer reported all alerts firing, with no loss of intensity. These are observations, not instrumented counts: duplicate counts, event timestamps and lateness were not collected.

### Battery comparison

- Foreground session: 2 percentage points over approximately 30 minutes (53% to 51%).
- Always-on reference: approximately 0.5 percentage points over approximately 30 minutes; initial and final readings and measurement method not supplied.
- Observed difference: approximately 1.5 percentage points. The two display modes differ, so this does not isolate the app's CPU, sound or vibration consumption.
- Battery readings are coarse and this is a single run; do not extrapolate precise runtime or attribute the difference to one component.

### Conclusion

Pass for foreground soak scenario 5 on the GTR 4 on reported alert continuity and recorded battery consumption. No intensity degradation was reported. This does not establish new timing accuracy measurements or close the Bluetooth-off scenario. Firmware and installed build remain unreported.

### GTS 4 compatibility follow-up

On 2026-10-12 the maintainer also confirmed testing the app on the Amazfit GTS 4 (square screen), with no apparent problems. This is a general usability observation, not a GTS 4 soak or instrumented timing result. Firmware, API_LEVEL, installed build and individual scenarios were not supplied.
