import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";
import { viteStaticCopy } from 'vite-plugin-static-copy';

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

const formatBuildPart = (value) => String(value).padStart(2, "0");

const createBuildMetadata = () => {
  const buildDate = new Date();
  const buildId = [
    buildDate.getFullYear(),
    formatBuildPart(buildDate.getMonth() + 1),
    formatBuildPart(buildDate.getDate()),
  ].join("") + "-" + [
    formatBuildPart(buildDate.getHours()),
    formatBuildPart(buildDate.getMinutes()),
    formatBuildPart(buildDate.getSeconds()),
  ].join("");

  return {
    version: packageJson.version,
    buildId,
    buildTime: buildDate.toISOString(),
  };
};

export default defineConfig(({ mode }) => {
  const buildMetadata = createBuildMetadata();

  return {
    define: {
      __APP_VERSION__: JSON.stringify(buildMetadata.version),
      __APP_BUILD_ID__: JSON.stringify(buildMetadata.buildId),
      __APP_BUILD_TIME__: JSON.stringify(buildMetadata.buildTime),
    },
    plugins: [
      react(),
      webExtension({
        manifest: "./src/manifest.json",
        watchFilePaths: ["src/**/*"],
        additionalInputs: [
          "src/content/injected.js",
          "src/devtools/panel.html",
          "src/popup/popup.html",
        ],
      }),
      viteStaticCopy({
        targets: [
          // Copy icons directory
          {
            src: 'icons/*',
            dest: 'icons'
          },
          // Copy _locales directory for Chrome i18n support (preserve structure)
          {
            src: 'src/_locales',
            dest: '',
            structured: true
          },
          // Copy utils directory for i18n mapping and other utilities
          {
            src: 'src/utils',
            dest: '',
            structured: true
          }
        ]
      })
    ],
    build: {
      minify: mode === "development" ? false : true,
      sourcemap: mode === "development",
      rollupOptions: {
        output: {
          inlineDynamicImports: false,
        },
      },
      watch:
        mode === "development"
          ? {
              include: ["src/**/*"],
              exclude: ["node_modules/**", "dist/**"],
              buildDelay: 300,
            }
          : null,
    },
  };
});
