import * as hmUI from "@zos/ui";
import { getDeviceInfo } from "@zos/device";
import { px } from "@zos/utils";

// The square screen's system title bar would cover the top of the page.
export function hideStatusBar() {
  hmUI.setStatusBarVisible(false);
}

const { width: DEVICE_WIDTH } = getDeviceInfo();
const MARGIN = px(24);
const WIDE = DEVICE_WIDTH - MARGIN * 2;
const ROW_Y = [px(92), px(204), px(316)];

const text = (props) => ({
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.CENTER_V,
  text_style: hmUI.text_style.NONE,
  text: "",
  ...props,
});

export const TITLE_STYLE = text({
  x: MARGIN,
  y: px(28),
  w: WIDE,
  h: px(48),
  color: 0xffffff,
  text_size: px(34),
  text: "Settings",
});

export const LABEL_STYLES = ROW_Y.map((y) =>
  text({ x: MARGIN, y, w: WIDE, h: px(28), color: 0xb0b0b0, text_size: px(26) }),
);

const BUTTON = { x: MARGIN, w: WIDE, h: px(72), radius: px(36), text_size: px(32) };
const ON = { ...BUTTON, normal_color: 0x2ecc71, press_color: 0x1e8e4f, color: 0x000000, text: "ON" };
const OFF = { ...BUTTON, normal_color: 0x424242, press_color: 0x616161, color: 0xffffff, text: "OFF" };

export const ON_BUTTONS = ROW_Y.map((y) => ({ ...ON, y: y + px(32) }));
export const OFF_BUTTONS = ROW_Y.map((y) => ({ ...OFF, y: y + px(32) }));

export const END_PAD_STYLE = text({ x: MARGIN, y: px(428), w: WIDE, h: px(40) });
