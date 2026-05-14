const appVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
const buildId = typeof __APP_BUILD_ID__ !== "undefined" ? __APP_BUILD_ID__ : "local";
const buildTime = typeof __APP_BUILD_TIME__ !== "undefined" ? __APP_BUILD_TIME__ : "";

const formatBuildId = (value) => {
  const match = String(value).match(
    /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/
  );

  if (!match) {
    return value;
  }

  const [, year, month, day, hour, minute, second] = match;
  return `${year}年${month}月${day}日 ${hour}时${minute}分${second}秒`;
};

export const BUILD_VERSION_TEXT = `v${appVersion} (${formatBuildId(buildId)})`;
export const BUILD_VERSION_TITLE = buildTime
  ? `Build ${buildId} @ ${buildTime}`
  : `Build ${buildId}`;
