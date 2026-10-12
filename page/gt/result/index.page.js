import * as hmUI from "@zos/ui";
import { totalSeconds, validateConfig } from "../../../lib/interval-engine.js";
import { formatTotal, presetName } from "../../../lib/presets.js";
import { PAGE, goBack, openInPlace, readParams } from "../../../utils/navigation.js";
import { clearSession } from "../../../utils/session-store.js";
import {
  CONFIG_STYLE,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  TITLE_STYLE,
  TOTAL_STYLE,
  hideStatusBar,
} from "zosLoader:./index.page.[pf].layout.js";

const KINDS = {
  completed: { title: "COMPLETED", color: 0x2ecc71, again: "Again", leave: "Home" },
  interrupted: { title: "INTERRUPTED", color: 0xffb300, again: "Restart", leave: "Discard" },
};

let kind = "completed";
let config = null;

Page({
  onInit(params) {
    const p = readParams(params);
    kind = KINDS[p.kind] ? p.kind : "interrupted";
    const checked = validateConfig(p.config);
    config = checked.ok ? checked.config : null;
  },
  build() {
    hideStatusBar();
    if (!config) {
      // Nothing trustworthy to show: drop the stored session and leave.
      clearSession();
      goBack();
      return;
    }
    const view = KINDS[kind];
    hmUI.createWidget(hmUI.widget.TEXT, { ...TITLE_STYLE, text: view.title, color: view.color });
    hmUI.createWidget(hmUI.widget.TEXT, { ...CONFIG_STYLE, text: presetName(config) });
    hmUI.createWidget(hmUI.widget.TEXT, { ...TOTAL_STYLE, text: "Total " + formatTotal(totalSeconds(config)) });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...PRIMARY_BUTTON,
      text: view.again,
      click_func: () => openInPlace(PAGE.session, { config }),
    });
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...SECONDARY_BUTTON,
      text: view.leave,
      click_func: () => {
        clearSession();
        goBack();
      },
    });
  },
});
