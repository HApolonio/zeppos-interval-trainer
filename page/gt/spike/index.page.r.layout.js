import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";

export const TITLE_STYLE = {
  x: px(140),
  y: px(56),
  w: px(200),
  h: px(44),
  color: 0xffffff,
  text_size: px(30),
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.CENTER_V,
  text_style: hmUI.text_style.NONE,
  text: "",
};

// Two 144 px buttons (300 wide) fit the chord (~307) at y 112; the report below scrolls with the page.
const BUTTON = { y: px(112), w: px(144), h: px(64), radius: px(32), text_size: px(28) };

export const START_BUTTON = {
  ...BUTTON,
  x: px(90),
  normal_color: 0x2ecc71,
  press_color: 0x1e8e4f,
  color: 0x000000,
  text: "Start",
};

export const STOP_BUTTON = {
  ...BUTTON,
  x: px(246),
  normal_color: 0x424242,
  press_color: 0x616161,
  color: 0xffffff,
  text: "Stop",
};

export const REPORT_LINE_H = px(38);
export const REPORT_TAIL_H = px(200);

export const REPORT_STYLE = {
  x: px(60),
  y: px(188),
  w: px(360),
  h: px(400),
  color: 0xb0b0b0,
  text_size: px(26),
  line_space: px(6),
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.TOP,
  text_style: hmUI.text_style.WRAP,
  text: "",
};
