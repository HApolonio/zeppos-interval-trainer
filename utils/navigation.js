import { back, push, replace } from "@zos/router";

export const PAGE = {
  home: "page/gt/home/index.page",
  editor: "page/gt/editor/index.page",
  session: "page/gt/session/index.page",
  result: "page/gt/result/index.page",
  settings: "page/gt/settings/index.page",
};

// Pages are destroyed on push and rebuilt on back, so state travels in params or storage.
export function open(url, params) {
  push({ url, params: params || {} });
}

export function openInPlace(url, params) {
  replace({ url, params: params || {} });
}

export function goBack() {
  back();
}

// onInit receives the params as a string; anything unreadable becomes an empty object.
export function readParams(raw) {
  if (raw && typeof raw === "object") return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    // Unreadable params mean the page was opened without any.
    return {};
  }
}
