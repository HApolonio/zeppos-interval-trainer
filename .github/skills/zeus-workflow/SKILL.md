---
name: zeus-workflow
description: 'Use when installing dependencies, running the simulator, previewing on the watch, building a package, logging in, or troubleshooting Zeus CLI, simulator or Zepp App developer mode problems for this project on Windows.'
argument-hint: 'Task or error message'
---

# Zeus workflow (Windows, PowerShell)

## Commands
| Task | Command | Notes |
|---|---|---|
| Install dependencies | `npm install` | Run in the project root. |
| Simulator preview | `zeus dev` | Start the Simulator and open the GTR 4 device first. Watches files and reloads. |
| Watch preview | `zeus preview` | Choose the target, then scan the QR code in Zepp App > Developer Mode > Scan. Needs `zeus login`. |
| Build package | `zeus build` | Output in `dist/`. |
| Status | `zeus status` | Login state. Simulator shows `disconnected` when `zeus dev` is not running; that is normal. |
| Unit tests | `npm test` | Pure logic only; no simulator needed. |

## Rules
- Never use `zeus create` flags (`--APILevel`, `--withAppSide`, `--withSettings`); the template list is empty in Zeus 1.9.3. Plain `zeus create <name>` works but always creates a subfolder.
- Debugging is log-based: `@zos/utils` `log.getLogger` in the Simulator Console and in Zepp App Developer Mode for the real watch. Breakpoint debugging of watch code is not supported.
- Run one terminal command at a time; `zeus dev` is a long-running process.

## Troubleshooting
1. Simulator not connecting: confirm the Simulator and GTR 4 device are open, then restart `zeus dev`.
2. QR scan or logs fail on the Android phone (MIUI): allow Zepp Bluetooth and nearby-device permissions; if it keeps disconnecting, allow background activity/autostart and remove battery restrictions for Zepp. This only affects installation and logging, not the watch-side timer.
3. Check the watch API_LEVEL: Zepp App > Profile > watch > scroll to the bottom > Developer Mode > Device information. Expected 305 (3.5).
4. Build errors about missing layouts: every page needs both `.r` and `.s` layout files and matching `assets/gt.r` and `assets/gt.s` folders.
5. More background: [docs/DEV-SETUP.md](../../../docs/DEV-SETUP.md).
