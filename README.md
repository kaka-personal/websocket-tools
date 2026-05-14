# websocket-tool

websocket-tool is a Chrome DevTools extension for inspecting, replaying, and controlling WebSocket traffic.

Inspect live frames, replay edge cases, and test unstable real-time flows without leaving DevTools.

## Highlights

- inspect WebSocket connections and message history in one place
- replay inbound or outbound payloads without touching application code
- block noisy traffic directions to reproduce race conditions and failure paths
- create manual connections for focused debugging
- keep reusable payloads in favorites for faster iteration
- run entirely in the browser with no required backend service

## Best For

- frontend debugging for chat, dashboards, streaming, and collaboration products
- QA validation of reconnect, timeout, and malformed payload scenarios
- backend and protocol testing with repeatable client or server-side message playback
- local investigation of noisy high-volume real-time systems

## Screenshot Placeholders

- `Screenshot 1`: connection list with active traffic
- `Screenshot 2`: message details and JSON formatting
- `Screenshot 3`: simulate panel and system events
- `Screenshot 4`: favorites and traffic control

## Local Development

```bash
npm install
npm run build
```

The build flow is cross-platform and works on Windows without relying on `rm -rf`.

## Publishing Checklist

Before public release, finish these replacements:

1. Set your own repository URL, homepage, and issue tracker in `package.json`.
2. Set your own support email and homepage in `PRIVACY.md`.
3. Fill in your project links in [src/utils/projectLinks.js](/C:/Users/Administrator/Desktop/AI/_tmp_websocket_devtools/src/utils/projectLinks.js).
4. Replace screenshot placeholders with your own product captures.
5. Review icons, screenshots, store copy, and naming for anything that still feels like the upstream official release.
6. Rebuild the extension and verify the generated `dist/` package before submission.

## Store Copy

Ready-to-publish store listing text is available in [docs/store-copy.md](/C:/Users/Administrator/Desktop/AI/_tmp_websocket_devtools/docs/store-copy.md).

## Branding

Brand direction, naming rules, and positioning notes are documented in [docs/branding.md](/C:/Users/Administrator/Desktop/AI/_tmp_websocket_devtools/docs/branding.md).

## License

websocket-tool is distributed under the MIT license included in [LICENSE](/C:/Users/Administrator/Desktop/AI/_tmp_websocket_devtools/LICENSE).
