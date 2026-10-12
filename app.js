import { log } from "@zos/utils";

const logger = log.getLogger("interval-trainer-app");

App({
  globalData: {},
  onCreate(options) {
    logger.log("app onCreate " + JSON.stringify(options));
  },

  onDestroy(options) {
    logger.log("app onDestroy " + JSON.stringify(options));
  },
});
