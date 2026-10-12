# Store Listing - Interval Trainer 1.0.0

Texts for the Zepp Developer Console submission ([how to submit](https://docs.zepp.com/docs/distribute/)). Language: English (`en-US`).

Status: v1.0 submitted to the Zepp Store (maintainer confirmation, 2026-10-12). The texts below are repository drafts, not a verified copy of the submitted console fields.

## Console fields
| Field | Value |
|---|---|
| App name | Interval Trainer |
| Package | `dist/*.zab` from `zeus build`; `appId` 1129777 |
| Version | 1.0.0 |
| Category | Health & Fitness (or the closest sports/training category offered) |
| Supported devices | Detected from the package (Amazfit GTR 4; GTS 4 if listed) |
| Calling permissions | Device information (`data:os.device.info`, used to size the layout); local storage (`device:os.local_storage`, presets and settings) |
| Installation package includes an SDK | No |
| App icon | 240x240 PNG, circular, transparent background, no margins |
| Screenshots | 360x360 PNG, transparent background, 3 or more |

## App profile (short)
Work/rest interval timer with a loud countdown beep and strong vibration before every change.

## App details (long)
Interval Trainer is a simple work/rest interval timer for your watch, built for training such as Tabata, HIIT, rounds and drills.

Set the work time, the rest time and the number of rounds, tap Start, and the watch does the rest:

- 5-second get-ready countdown before the first work phase
- A beep countdown that ends exactly on every change between work and rest, and at the finish
- Strong vibration at 5, 4, 3, 2 and 1 seconds before each change
- Large, high-contrast countdown with a progress ring (round watches) or bar (square watches)
- Pause, resume and stop with confirmation
- Presets saved on the watch, named from their values (for example 60/15 x 5), up to 20
- Settings to switch sound, vibration and the 5-1 second vibration on or off
- Works fully offline; no phone app or account needed

Work and rest can be set from 6 seconds to 60 minutes, and rounds from 1 to 99. The default session is 60 s work, 15 s rest, 5 rounds (6:00 total).

Good to know: the screen stays on during a session so the sound and vibration are reliable. Keep the app open while you train; closing it ends the alerts. A paused workout can be resumed from the presets screen.

## Privacy statement
Interval Trainer does not collect, store off the device, transmit or share any personal data.

- The app works entirely offline on your watch and has no network access, accounts, analytics, advertising or third-party SDKs.
- It stores only your timer presets (work time, rest time, rounds), your three settings (sound, vibration, 5-1 second vibration) and the state of the current workout, so a paused workout can be resumed. This data stays in the app's local storage on the watch and is removed when the app is uninstalled.
- The app uses basic device information (screen size) to fit the layout and the system clock to time intervals. It does not read health measurements, location, contacts or other personal data.
- The app uses the watch speaker and vibration motor to play the countdown alerts.

Contact: <add your support e-mail or repository URL before submitting>

## Screenshot suggestions (360x360, transparent background)
1. Session screen during WORK (green ring, large time)
2. Session screen in the last 5 seconds (amber)
3. Presets list
4. Editor with the three rows and the total
5. Settings
6. Result screen (COMPLETED)

For round watches place the screenshot in the middle of the transparent square with no margins; for square watches use equal left and right margins and none at the top and bottom.

## Before submitting
- `npm test` and `zeus build` pass; install the built package on the watch once.
- Confirm the layout on the GTS 4 simulator if GTS 4 is listed as supported.
- Add the contact line to the privacy statement.
