import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";

// Only square screens have a system title bar over the page.
export function hideStatusBar() {}

// Round screen: cards stay inside a 280 design px wide column (safe chord at the first row is about 290).
const CARD_X = px(100);
const CARD_W = px(280);

export const TITLE_STYLE = {
  x: px(140),
  y: px(52),
  w: px(200),
  h: px(44),
  color: 0xffffff,
  text_size: px(34),
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.CENTER_V,
  text_style: hmUI.text_style.NONE,
  text: "Presets",
};

export const FIRST_Y = px(108);
export const SESSION_PITCH = px(80);
export const PRESET_PITCH = px(114);
export const NEW_PITCH = px(80);

const CARD = { x: CARD_X, w: CARD_W, radius: px(32), text_size: px(32) };

export const SESSION_CARD = { ...CARD, h: px(64), text_size: px(30) };
export const PRESET_CARD = {
  ...CARD,
  h: px(72),
  normal_color: 0x333333,
  press_color: 0x4d4d4d,
  color: 0xffffff,
};
export const NEW_CARD = {
  ...CARD,
  h: px(64),
  normal_color: 0x2ecc71,
  press_color: 0x1e8e4f,
  color: 0x000000,
  text: "New preset",
};

export const CAPTION_STYLE = {
  x: CARD_X,
  w: CARD_W,
  h: px(28),
  color: 0xb0b0b0,
  text_size: px(24),
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.CENTER_V,
  text_style: hmUI.text_style.NONE,
  text: "",
};

// Empty space after the last card so it can scroll above the round edge.
export const END_PAD_STYLE = { ...CAPTION_STYLE, h: px(80) };
