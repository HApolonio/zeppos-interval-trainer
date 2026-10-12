import * as hmUI from "@zos/ui";
import { MODAL_CONFIRM, createModal } from "@zos/interaction";
import { totalSeconds } from "../../../lib/interval-engine.js";
import {
  findPreset,
  formatTotal,
  removePreset,
  stepConfigValue,
  updatePreset,
} from "../../../lib/presets.js";
import { PAGE, goBack, openInPlace, readParams } from "../../../utils/navigation.js";
import { loadPresets, savePresets } from "../../../utils/session-store.js";
import {
  DELETE_BUTTON,
  END_PAD_STYLE,
  LABEL_STYLES,
  MINUS_STYLES,
  PLUS_STYLES,
  START_BUTTON,
  TOTAL_STYLE,
  VALUE_STYLES,
  hideStatusBar,
} from "zosLoader:./index.page.[pf].layout.js";

const FIELDS = [
  { key: "workSec", label: "Work" },
  { key: "restSec", label: "Rest" },
  { key: "rounds", label: "Rounds" },
];

let presets = [];
let presetId = null;
let config = null;
let valueWidgets = [];
let totalWidget = null;

const formatValue = (key, value) => (key === "rounds" ? String(value) : formatTotal(value));

// Every change is saved at once; a new preset is created on the presets screen before it opens here.
function step(index, direction) {
  const { key } = FIELDS[index];
  const next = stepConfigValue(key, config[key], direction);
  if (next === config[key]) return;
  const updated = updatePreset(presets, presetId, { ...config, [key]: next });
  if (!updated.ok) return;
  presets = updated.presets;
  config = findPreset(presets, presetId).config;
  savePresets(presets);
  render();
}

function render() {
  FIELDS.forEach(({ key }, i) => valueWidgets[i].setProperty(hmUI.prop.TEXT, formatValue(key, config[key])));
  totalWidget.setProperty(hmUI.prop.TEXT, "Total " + formatTotal(totalSeconds(config)));
}

function confirmDelete() {
  createModal({
    content: "Delete preset?",
    onClick: ({ type }) => {
      if (type !== MODAL_CONFIRM) return;
      savePresets(removePreset(presets, presetId));
      goBack();
    },
  });
}

Page({
  onInit(params) {
    presetId = readParams(params).id || null;
  },
  build() {
    hideStatusBar();
    presets = loadPresets();
    const preset = findPreset(presets, presetId);
    if (!preset) {
      goBack();
      return;
    }
    config = preset.config;
    valueWidgets = [];
    FIELDS.forEach(({ label }, i) => {
      hmUI.createWidget(hmUI.widget.TEXT, { ...LABEL_STYLES[i], text: label });
      valueWidgets.push(hmUI.createWidget(hmUI.widget.TEXT, VALUE_STYLES[i]));
      hmUI.createWidget(hmUI.widget.BUTTON, { ...MINUS_STYLES[i], click_func: () => step(i, -1) });
      hmUI.createWidget(hmUI.widget.BUTTON, { ...PLUS_STYLES[i], click_func: () => step(i, 1) });
    });
    totalWidget = hmUI.createWidget(hmUI.widget.TEXT, TOTAL_STYLE);
    hmUI.createWidget(hmUI.widget.BUTTON, {
      ...START_BUTTON,
      click_func: () => openInPlace(PAGE.session, { config }),
    });
    hmUI.createWidget(hmUI.widget.BUTTON, { ...DELETE_BUTTON, click_func: confirmDelete });
    hmUI.createWidget(hmUI.widget.TEXT, END_PAD_STYLE);
    render();
  },
  onDestroy() {
    valueWidgets = [];
    totalWidget = null;
  },
});
