import * as hmUI from "@zos/ui";
import { getDeviceInfo } from "@zos/device";
import { px } from "@zos/utils";

// The square screen's system title bar would cover the top of the page.
export function hideStatusBar() {
  hmUI.setStatusBarVisible(false);
}

const { width: DEVICE_WIDTH } = getDeviceInfo();
const MARGIN = px(24);
const CARD_W = DEVICE_WIDTH - MARGIN * 2;

export const TITLE_STYLE = {
  x: MARGIN,
  y: px(28),
  w: CARD_W,
  h: px(48),
  color: 0xffffff,
  text_size: px(34),
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.CENTER_V,
  text_style: hmUI.text_style.NONE,
  text: "Presets",
};

export const FIRST_Y = px(92);
export const SESSION_PITCH = px(84);
export const PRESET_PITCH = px(116);
export const NEW_PITCH = px(84);

const CARD = { x: MARGIN, w: CARD_W, radius: px(34), text_size: px(32) };

export const SESSION_CARD = { ...CARD, h: px(68), text_size: px(30) };
export const PRESET_CARD = {
  ...CARD,
  h: px(76),
  normal_color: 0x333333,
  press_color: 0x4d4d4d,
  color: 0xffffff,
};
export const NEW_CARD = {
  ...CARD,
  h: px(68),
  normal_color: 0x2ecc71,
  press_color: 0x1e8e4f,
  color: 0x000000,
  text: "New preset",
};

export const CAPTION_STYLE = {
  x: MARGIN,
  w: CARD_W,
  h: px(28),
  color: 0xb0b0b0,
  text_size: px(24),
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.CENTER_V,
  text_style: hmUI.text_style.NONE,
  text: "",
};

export const END_PAD_STYLE = { ...CAPTION_STYLE, h: px(40) };
