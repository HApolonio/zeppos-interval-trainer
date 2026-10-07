---
description: "Review a page's round and square layout files against the safe-area, px and update rules"
argument-hint: "Page folder, e.g. page/gt/session"
agent: "agent"
tools: [search, read, problems]
---
Review the given page folder without changing files.

- Check that both `index.page.r.layout.js` and `index.page.s.layout.js` exist and are imported with `zosLoader`.
- Verify the rules in [zepp-ui instructions](../instructions/zepp-ui.instructions.md) and the geometry in [session screen spec](../../docs/specs/03-session-screen.md).
- For the round layout, compute the chord width at the top and bottom edge of each row (safe radius about 200 design px, centre at 240,240) and flag clipping.
- Flag hard-coded device sizes, missing `px()`, double scaling of `getDeviceInfo()` values, widgets recreated on every tick, and timers not cleared in `onDestroy`.
- Output a table: finding, file and line, severity, suggested fix. Reply in pt-PT.
