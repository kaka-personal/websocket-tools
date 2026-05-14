import { BRAND_NAME } from "../utils/branding.js";

// DevTools main entry file

// Check if extension is enabled
function checkExtensionEnabled() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["websocket-proxy-enabled"], (result) => {
      resolve(result["websocket-proxy-enabled"] !== false); // Default enabled
    });
  });
}

// Only create DevTools Panel when extension is enabled
checkExtensionEnabled().then((enabled) => {
  if (enabled) {
    chrome.devtools.panels.create(
      BRAND_NAME,
      "icons/icon.svg", // Panel icon path - SVG for better Edge compatibility
      "src/devtools/panel.html",
      function (panel) {
        // When panel is shown
        panel.onShown.addListener(function (panelWindow) {
        });

        // When panel is hidden
        panel.onHidden.addListener(function () {
        });
      }
    );
  }
});
