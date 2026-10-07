import * as hmUI from "@zos/ui";
import { getDeviceInfo } from "@zos/device";
import { px } from "@zos/utils";

const { width: DEVICE_WIDTH } = getDeviceInfo();
const MARGIN = px(24);
const GAP = px(12);
const BUTTON_H = px(72);
const BUTTON_Y = px(84);
const BUTTON_W = (DEVICE_WIDTH - MARGIN * 2 - GAP) / 2;
const REPORT_Y = BUTTON_Y + BUTTON_H + px(16);

export const REPORT_LINE_H = px(38);
export const REPORT_TAIL_H = px(120);

export const TITLE_STYLE = {
  x: MARGIN,
  y: px(28),
  w: DEVICE_WIDTH - MARGIN * 2,
  h: px(48),
  color: 0xffffff,
  text_size: px(32),
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.CENTER_V,
  text_style: hmUI.text_style.NONE,
  text: "",
};

export const REPORT_STYLE = {
  x: MARGIN,
  y: REPORT_Y,
  w: DEVICE_WIDTH - MARGIN * 2,
  h: px(400),
  color: 0xb0b0b0,
  text_size: px(26),
  line_space: px(6),
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.TOP,
  text_style: hmUI.text_style.WRAP,
  text: "",
};

const BUTTON = { y: BUTTON_Y, w: BUTTON_W, h: BUTTON_H, radius: px(36), text_size: px(30) };

export const START_BUTTON = {
  ...BUTTON,
  x: MARGIN,
  normal_color: 0x2ecc71,
  press_color: 0x1e8e4f,
  color: 0x000000,
  text: "Start",
};

export const STOP_BUTTON = {
  ...BUTTON,
  x: MARGIN + BUTTON_W + GAP,
  normal_color: 0x424242,
  press_color: 0x616161,
  color: 0xffffff,
  text: "Stop",
};
