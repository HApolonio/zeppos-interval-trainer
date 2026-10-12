import * as hmUI from "@zos/ui";
import { Time } from "@zos/sensor";
import { log as Logger } from "@zos/utils";
import { DEFAULT_CONFIG, totalSeconds } from "../../../lib/interval-engine.js";
import {
  MAX_PRESETS,
  addPreset,
  formatTotal,
  newPresetId,
  presetName,
} from "../../../lib/presets.js";
import { recoverSession } from "../../../lib/session-recovery.js";
import { PAGE, open } from "../../../utils/navigation.js";
import { loadPresets, loadSession, saveSession, savePresets } from "../../../utils/session-store.js";
import {
  CAPTION_STYLE,
  END_PAD_STYLE,
  FIRST_Y,
  NEW_CARD,
  NEW_PITCH,
  PRESET_CARD,
  PRESET_PITCH,
  SESSION_CARD,
  SESSION_PITCH,
  TITLE_STYLE,
  hideStatusBar,
} from "zosLoader:./index.page.[pf].layout.js";

const logger = Logger.getLogger("interval-trainer");
const time = new Time();

// Card for a stored session: resume a paused one, or look at one that ended or was interrupted.
const SESSION_CARDS = {
  paused: { text: "Resume", normal_color: 0xffb300, press_color: 0xb27d00, color: 0x000000 },
  completed: { text: "Completed", normal_color: 0x424242, press_color: 0x616161, color: 0xffffff },
  interrupted: { text: "Interrupted", normal_color: 0x424242, press_color: 0x616161, color: 0xffffff },
};

function createSessionCard(recovered, y) {
  hmUI.createWidget(hmUI.widget.BUTTON, {
    ...SESSION_CARD,
    ...SESSION_CARDS[recovered.kind],
    y,
    click_func: () => {
      if (recovered.kind === "paused") open(PAGE.session, { resume: true });
      else open(PAGE.result, { kind: recovered.kind, config: recovered.session.config });
    },
  });
}

function createPresetCard(preset, y) {
  hmUI.createWidget(hmUI.widget.BUTTON, {
    ...PRESET_CARD,
    y,
    text: presetName(preset.config),
    click_func: () => open(PAGE.editor, { id: preset.id }),
  });
  hmUI.createWidget(hmUI.widget.TEXT, {
    ...CAPTION_STYLE,
    y: y + PRESET_CARD.h,
    text: "Total " + formatTotal(totalSeconds(preset.config)),
  });
}

function createNewCard(presets, y) {
  hmUI.createWidget(hmUI.widget.BUTTON, {
    ...NEW_CARD,
    y,
    click_func: () => {
      const added = addPreset(presets, DEFAULT_CONFIG, newPresetId(presets, time.getTime()));
      if (!added.ok) return;
      savePresets(added.presets);
      open(PAGE.editor, { id: added.presets[added.presets.length - 1].id });
    },
  });
}

function createSettingsCard(y) {
  hmUI.createWidget(hmUI.widget.BUTTON, {
    ...NEW_CARD,
    y,
    text: "Settings",
    normal_color: 0x424242,
    press_color: 0x616161,
    color: 0xffffff,
    click_func: () => open(PAGE.settings),
  });
}

Page({
  onInit() {
    logger.debug("page onInit invoked");
  },
  build() {
    logger.debug("page build invoked");
    hideStatusBar();
    const presets = loadPresets();
    const stored = loadSession();
    const recovered = recoverSession(stored, time.getTime());
    // Keep a recovered end state (completed, interrupted) so the next open shows the same card.
    if (recovered.session && recovered.session !== stored) saveSession(recovered.session);

    hmUI.createWidget(hmUI.widget.TEXT, TITLE_STYLE);
    let y = FIRST_Y;
    if (recovered.kind !== "none") {
      createSessionCard(recovered, y);
      y += SESSION_PITCH;
    }
    for (const preset of presets) {
      createPresetCard(preset, y);
      y += PRESET_PITCH;
    }
    if (presets.length < MAX_PRESETS) {
      createNewCard(presets, y);
      y += NEW_PITCH;
    }
    createSettingsCard(y);
    y += NEW_PITCH;
    hmUI.createWidget(hmUI.widget.TEXT, { ...END_PAD_STYLE, y });
  },
  onDestroy() {
    logger.debug("page onDestroy invoked");
  },
});
