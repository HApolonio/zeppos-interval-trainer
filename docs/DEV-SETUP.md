# Development Setup (Windows)

## Verified environment
| Item | Value |
|---|---|
| Node / npm | 24.20.0 / 11.19.0 |
| Zeus CLI / zpm | 1.9.3 / 3.4.2 |
| Simulator | 2.1 with Amazfit GTR 4 device (OS 3.5, API level 3.5) |
| Watch | Amazfit GTR 4, Zepp OS 3.5, firmware 7.6.0.2, API_LEVEL 305 |
| Phone | Android 13 (MIUI 14), Zepp app with Developer Mode enabled |

## One-time setup (done)
1. `npm i @zeppos/zeus-cli -g` and `zeus -v`.
2. Install the Zepp OS Simulator for Windows and download the device (GTR 4).
3. Zepp App: Profile > Settings > About > tap the Zepp icon 7 times to enable Developer Mode.
4. `zeus login`; check with `zeus status`.

## Daily workflow
- Simulator: open the Simulator and the GTR 4 device, then `zeus dev` in the project root.
- Real watch: `zeus preview`, choose the target, scan the QR code in Zepp App > Profile > watch > Developer Mode > Scan.
- Build: `zeus build` (output in `dist/`).
- Logs: Simulator Console, or Zepp App Developer Mode for the real watch. There is no breakpoint debugging for watch code.
- API_LEVEL: Zepp App > Profile > watch > scroll to the bottom > Developer Mode > Device information icon.

## Project scaffold history
- `zeus create <name>` always creates a subfolder. This repository was seeded from a generated `hello-world` project (template target `gt`, platforms `r` and `s`, `designWidth` 480, permissions device info and local storage).
- `zeus create` with `--APILevel 3.5 --withAppSide --withSettings` hangs on an empty template list in Zeus 1.9.3; do not use those flags.
- The original sample `zeppos-timer-app` is a separate repository kept as a reference.

## Project configuration (milestone B1, done)
- `app.json`: appId 1129777, name "Interval Trainer", permissions device info and local storage; pages home, editor, session, result, settings.
- `package.json` scripts: `npm run dev`, `npm run preview`, `npm run build` (wrap `zeus`), `npm test` (`node --test`, default patterns, finds `tests/*.test.mjs`).
- `package-lock.json` is tracked; run `npm install` after cloning.
- `zeus build` produces `dist/<appId>-Interval_Trainer-<version>-<timestamp>.zab` and prints a notice about intermediate products (`zeus prune --ip` removes them); no action needed for development.

## Phone notes (MIUI)
Allow Zepp Bluetooth and nearby-device permissions. If installation or log collection disconnects, allow background activity/autostart and remove battery restrictions for Zepp. This affects only installation and logging, not the timer running on the watch.
