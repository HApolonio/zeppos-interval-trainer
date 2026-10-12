import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";

// Only square screens have a system title bar over the page.
export function hideStatusBar() {}

// Round screen: row centres sit at 128, 212 and 296 design px, so the 72 px +/- buttons stay inside the safe radius.
const ROW_Y = [px(92), px(176), px(260)];
const TEXT_X = px(166);
const TEXT_W = px(148);

const text = (props) => ({
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.CENTER_V,
  text_style: hmUI.text_style.NONE,
  text: "",
  ...props,
});

const stepButton = (x, y, label) => ({
  x,
  y,
  w: px(72),
  h: px(72),
  radius: px(36),
  normal_color: 0x333333,
  press_color: 0x4d4d4d,
  color: 0xffffff,
  text_size: px(44),
  text: label,
});

export const LABEL_STYLES = ROW_Y.map((y) =>
  text({ x: TEXT_X, y: y + px(2), w: TEXT_W, h: px(26), color: 0xb0b0b0, text_size: px(24) }),
);
export const VALUE_STYLES = ROW_Y.map((y) =>
  text({ x: TEXT_X, y: y + px(26), w: TEXT_W, h: px(46), color: 0xffffff, text_size: px(40) }),
);
export const MINUS_STYLES = ROW_Y.map((y) => stepButton(px(84), y, "-"));
export const PLUS_STYLES = ROW_Y.map((y) => stepButton(px(324), y, "+"));

export const TOTAL_STYLE = text({ x: px(120), y: px(52), w: px(240), h: px(32), color: 0xb0b0b0, text_size: px(26) });

export const START_BUTTON = {
  x: px(130),
  y: px(346),
  w: px(220),
  h: px(64),
  radius: px(32),
  normal_color: 0x2ecc71,
  press_color: 0x1e8e4f,
  color: 0x000000,
  text_size: px(30),
  text: "Start",
};

// Below the round edge on purpose: deleting needs a scroll.
export const DELETE_BUTTON = {
  x: px(160),
  y: px(424),
  w: px(160),
  h: px(52),
  radius: px(26),
  normal_color: 0x7a2e2e,
  press_color: 0x9a3b3b,
  color: 0xffffff,
  text_size: px(26),
  text: "Delete",
};

export const END_PAD_STYLE = text({ x: px(100), y: px(484), w: px(280), h: px(40) });
