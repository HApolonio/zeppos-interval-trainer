import * as hmUI from "@zos/ui";
import { px } from "@zos/utils";

// The square screen's system title bar would cover the top of the page.
export function hideStatusBar() {
  hmUI.setStatusBarVisible(false);
}

const text = (props) => ({
  align_h: hmUI.align.CENTER_H,
  align_v: hmUI.align.CENTER_V,
  text_style: hmUI.text_style.NONE,
  text: "",
  ...props,
});

const MARGIN = px(24);
const WIDE = px(432);

// Square screen (design height about 554): no ring, a horizontal bar instead.
export const LABEL_STYLE = text({ x: MARGIN, y: px(60), w: WIDE, h: px(52), color: 0xffffff, text_size: px(40) });
export const TIME_STYLE = text({ x: MARGIN, y: px(130), w: WIDE, h: px(150), color: 0xffffff, text_size: px(130) });
export const ROUND_STYLE = text({ x: MARGIN, y: px(316), w: WIDE, h: px(44), color: 0xb0b0b0, text_size: px(34) });

const PAUSE_BOX = { x: MARGIN, y: px(372), w: WIDE, h: px(80), radius: px(40), text_size: px(34) };

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
  ...PAUSE_BOX,
  y: px(464),
  normal_color: 0x7a2e2e,
  press_color: 0x9a3b3b,
  color: 0xffffff,
  text: "Stop",
};

const BAR = { x: MARGIN, y: px(292), w: WIDE, h: px(14), radius: px(7) };

// fraction is the elapsed share of the phase, 0..1; the bar shows what remains.
export function createProgress(color) {
  hmUI.createWidget(hmUI.widget.FILL_RECT, { ...BAR, color: 0x2a2a2a });
  const style = { ...BAR, color };
  const fill = hmUI.createWidget(hmUI.widget.FILL_RECT, style);
  return {
    // Whole bar pixels are the finest step that can change.
    key: (fraction) => Math.floor(fraction * BAR.w),
    set(fraction, color) {
      fill.setProperty(hmUI.prop.MORE, {
        ...style,
        w: Math.max(1, Math.round(BAR.w * (1 - fraction))),
        color,
      });
    },
  };
}
