import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";

// Only square screens have a system title bar over the page.
export function hideStatusBar() {}

const text = (props) => ({
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.CENTER_V,
  text_style: hmUI.text_style.NONE,
  text: "",
  ...props,
});

export const LABEL_STYLE = text({ x: px(100), y: px(56), w: px(280), h: px(44), color: 0xffffff, text_size: px(36) });
export const TIME_STYLE = text({ x: px(40), y: px(100), w: px(400), h: px(120), color: 0xffffff, text_size: px(110) });
export const ROUND_STYLE = text({ x: px(100), y: px(222), w: px(280), h: px(36), color: 0xb0b0b0, text_size: px(30) });

// Pause/Resume and Stop are stacked so both are easy to hit; the widths follow the round chord.
const PAUSE_BOX = { x: px(110), y: px(268), w: px(260), h: px(76), radius: px(38), text_size: px(32) };

export const PAUSE_BUTTON = {
  ...PAUSE_BOX,
  normal_color: 0x424242,
  press_color: 0x616161,
  color: 0xffffff,
  text: "Pause",
};
export const RESUME_BUTTON = {
  ...PAUSE_BOX,
  normal_color: 0x2ecc71,
  press_color: 0x1e8e4f,
  color: 0x000000,
  text: "Resume",
};
export const STOP_BUTTON = {
  x: px(150),
  y: px(354),
  w: px(180),
  h: px(64),
  radius: px(32),
  text_size: px(28),
  normal_color: 0x7a2e2e,
  press_color: 0x9a3b3b,
  color: 0xffffff,
  text: "Stop",
};

const RING = {
  x: px(12),
  y: px(12),
  w: px(456),
  h: px(456),
  radius: px(228),
  line_width: px(14),
};

// Round screen: a ring that shrinks clockwise from the top (0 deg is 3 o'clock).
// fraction is the elapsed share of the phase, 0..1.
export function createProgress(color) {
  hmUI.createWidget(hmUI.widget.ARC, { ...RING, start_angle: 0, end_angle: 360, color: 0x2a2a2a });
  const style = { ...RING, start_angle: -90, end_angle: 270, color };
  const ring = hmUI.createWidget(hmUI.widget.ARC, style);
  return {
    // One step per degree is enough for the eye; the caller repaints only when this key changes.
    key: (fraction) => Math.floor(fraction * 360),
    set(fraction, color) {
      ring.setProperty(hmUI.prop.MORE, {
        ...style,
        start_angle: Math.min(-90 + 360 * fraction, 269),
        color,
      });
    },
  };
}
