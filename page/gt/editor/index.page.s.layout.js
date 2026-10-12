import * as hmUI from "@zos/ui";
import { getDeviceInfo } from "@zos/device";
import { px } from "@zos/utils";

// The square screen's system title bar would cover the top of the page.
export function hideStatusBar() {
  hmUI.setStatusBarVisible(false);
}

const { width: DEVICE_WIDTH } = getDeviceInfo();
const MARGIN = px(24);
const STEP = px(96);
const TEXT_X = MARGIN + px(108);
const TEXT_W = DEVICE_WIDTH - TEXT_X * 2;
const ROW_Y = [px(28), px(138), px(248)];

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
  w: STEP,
  h: STEP,
  radius: px(48),
  normal_color: 0x333333,
  press_color: 0x4d4d4d,
  color: 0xffffff,
  text_size: px(52),
  text: label,
});

export const LABEL_STYLES = ROW_Y.map((y) =>
  text({ x: TEXT_X, y: y + px(10), w: TEXT_W, h: px(28), color: 0xb0b0b0, text_size: px(26) }),
);
export const VALUE_STYLES = ROW_Y.map((y) =>
  text({ x: TEXT_X, y: y + px(38), w: TEXT_W, h: px(52), color: 0xffffff, text_size: px(44) }),
);
export const MINUS_STYLES = ROW_Y.map((y) => stepButton(MARGIN, y, "-"));
export const PLUS_STYLES = ROW_Y.map((y) => stepButton(DEVICE_WIDTH - MARGIN - STEP, y, "+"));

export const TOTAL_STYLE = text({
  x: MARGIN,
  y: px(356),
  w: DEVICE_WIDTH - MARGIN * 2,
  h: px(40),
  color: 0xb0b0b0,
  text_size: px(30),
});

export const START_BUTTON = {
  x: MARGIN,
  y: px(404),
  w: DEVICE_WIDTH - MARGIN * 2,
  h: px(80),
  radius: px(40),
  normal_color: 0x2ecc71,
  press_color: 0x1e8e4f,
  color: 0x000000,
  text_size: px(32),
  text: "Start",
};

export const DELETE_BUTTON = {
  x: (DEVICE_WIDTH - px(200)) / 2,
  y: px(500),
  w: px(200),
  h: px(64),
  radius: px(32),
  normal_color: 0x7a2e2e,
  press_color: 0x9a3b3b,
  color: 0xffffff,
  text_size: px(28),
  text: "Delete",
};

export const END_PAD_STYLE = text({ x: MARGIN, y: px(580), w: DEVICE_WIDTH - MARGIN * 2, h: px(40) });
