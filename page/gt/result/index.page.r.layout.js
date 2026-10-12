import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";

// Only square screens have a system title bar over the page.
export function hideStatusBar() {}

const text = (props) => ({
  x: px(60),
  w: px(360),
  color: 0xffffff,
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.CENTER_V,
  text_style: hmUI.text_style.NONE,
  text: "",
  ...props,
});

export const TITLE_STYLE = text({ y: px(70), h: px(56), text_size: px(40) });
export const CONFIG_STYLE = text({ y: px(130), h: px(36), color: 0xb0b0b0, text_size: px(30) });
export const TOTAL_STYLE = text({ y: px(168), h: px(34), color: 0xb0b0b0, text_size: px(26) });

export const PRIMARY_BUTTON = {
  x: px(110),
  y: px(218),
  w: px(260),
  h: px(72),
  radius: px(36),
  text_size: px(30),
  normal_color: 0x2ecc71,
  press_color: 0x1e8e4f,
  color: 0x000000,
};

export const SECONDARY_BUTTON = {
  x: px(130),
  y: px(302),
  w: px(220),
  h: px(68),
  radius: px(34),
  text_size: px(28),
  normal_color: 0x424242,
  press_color: 0x616161,
  color: 0xffffff,
};
