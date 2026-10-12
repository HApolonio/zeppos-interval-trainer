import * as hmUI from "@zos/ui";
import { toggleSetting } from "../../../lib/settings.js";
import { loadSettings, saveSettings } from "../../../utils/session-store.js";
import {
  END_PAD_STYLE,
  LABEL_STYLES,
  OFF_BUTTONS,
  ON_BUTTONS,
  TITLE_STYLE,
  hideStatusBar,
} from "zosLoader:./index.page.[pf].layout.js";

const ROWS = [
  { key: "sound", label: "Sound" },
  { key: "vibration", label: "Vibration" },
  { key: "warnings", label: "5-1 s vibration" },
];

let settings = null;
let widgets = [];

function render() {
  ROWS.forEach(({ key }, i) => {
    widgets[i].on.setProperty(hmUI.prop.VISIBLE, settings[key]);
    widgets[i].off.setProperty(hmUI.prop.VISIBLE, !settings[key]);
  });
}

function toggle(key) {
  settings = toggleSetting(settings, key);
  saveSettings(settings);
  render();
}

Page({
  build() {
    hideStatusBar();
    settings = loadSettings();
    widgets = [];
    hmUI.createWidget(hmUI.widget.TEXT, TITLE_STYLE);
    ROWS.forEach(({ key, label }, i) => {
      hmUI.createWidget(hmUI.widget.TEXT, { ...LABEL_STYLES[i], text: label });
      widgets.push({
        on: hmUI.createWidget(hmUI.widget.BUTTON, { ...ON_BUTTONS[i], click_func: () => toggle(key) }),
        off: hmUI.createWidget(hmUI.widget.BUTTON, { ...OFF_BUTTONS[i], click_func: () => toggle(key) }),
      });
    });
    hmUI.createWidget(hmUI.widget.TEXT, END_PAD_STYLE);
    render();
  },
  onDestroy() {
    widgets = [];
  },
});
