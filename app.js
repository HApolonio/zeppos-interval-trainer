import { log } from "@zos/utils";

const logger = log.getLogger("interval-trainer-app");

// Logged to see whether alarms or the permission flow relaunch the app (B3).
App({
  globalData: {},
  onCreate(options) {
    logger.log("app onCreate " + JSON.stringify(options));
  },

  onDestroy(options) {
    logger.log("app onDestroy " + JSON.stringify(options));
  },
});
