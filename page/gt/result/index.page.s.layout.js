import * as hmUI from "@zos/ui";
import { getDeviceInfo } from "@zos/device";
import { px } from "@zos/utils";

// The square screen's system title bar would cover the top of the page.
export function hideStatusBar() {
  hmUI.setStatusBarVisible(false);
}

const { width: DEVICE_WIDTH } = getDeviceInfo();
const MARGIN = px(24);

const text = (props) => ({
  x: MARGIN,
  w: DEVICE_WIDTH - MARGIN * 2,
  color: 0xffffff,
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.CENTER_V,
  text_style: hmUI.text_style.NONE,
  text: "",
  ...props,
});

export const TITLE_STYLE = text({ y: px(80), h: px(72), text_size: px(48) });
export const CONFIG_STYLE = text({ y: px(168), h: px(44), color: 0xb0b0b0, text_size: px(34) });
export const TOTAL_STYLE = text({ y: px(216), h: px(44), color: 0xb0b0b0, text_size: px(30) });

const BUTTON = { x: MARGIN, w: DEVICE_WIDTH - MARGIN * 2, h: px(80), radius: px(40), text_size: px(32) };

export const PRIMARY_BUTTON = {
  ...BUTTON,
  y: px(308),
  normal_color: 0x2ecc71,
  press_color: 0x1e8e4f,
  color: 0x000000,
};

export const SECONDARY_BUTTON = {
  ...BUTTON,
  y: px(400),
  normal_color: 0x424242,
  press_color: 0x616161,
  color: 0xffffff,
};
