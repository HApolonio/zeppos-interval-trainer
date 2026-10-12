import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";

// Only square screens have a system title bar over the page.
export function hideStatusBar() {}

const ROW_Y = [px(104), px(208), px(312)];
const X = px(120);
const W = px(240);

const text = (props) => ({
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.CENTER_V,
  text_style: hmUI.text_style.NONE,
  text: "",
  ...props,
});

export const TITLE_STYLE = text({
  x: px(140),
  y: px(52),
  w: px(200),
  h: px(44),
  color: 0xffffff,
  text_size: px(34),
  text: "Settings",
});

export const LABEL_STYLES = ROW_Y.map((y) =>
  text({ x: px(100), y, w: px(280), h: px(26), color: 0xb0b0b0, text_size: px(24) }),
);

const BUTTON = { x: X, w: W, h: px(64), radius: px(32), text_size: px(30) };
const ON = { ...BUTTON, normal_color: 0x2ecc71, press_color: 0x1e8e4f, color: 0x000000, text: "ON" };
const OFF = { ...BUTTON, normal_color: 0x424242, press_color: 0x616161, color: 0xffffff, text: "OFF" };

// Both states are created per row and shown one at a time.
export const ON_BUTTONS = ROW_Y.map((y) => ({ ...ON, y: y + px(30) }));
export const OFF_BUTTONS = ROW_Y.map((y) => ({ ...OFF, y: y + px(30) }));

export const END_PAD_STYLE = text({ x: px(100), y: px(420), w: px(280), h: px(60) });
