<div align="center">
  <img src="./ScreenShot/ScreenShot-long-quick-radius.png" alt="websocket-tools overview" width="92%" />

  # websocket-tools

  **Inspect WebSocket traffic directly inside Chrome DevTools.**

  A read-only developer panel for watching live frames, reviewing connection lifecycle, and filtering noisy streams without touching application code.

  **English** | [简体中文](./README_zh-CN.md)
</div>

## Why websocket-tools

Modern apps hide critical product logic behind WebSocket streams: chat, dashboards, AI streaming, collaboration, telemetry, trading, notifications, and internal control channels.

`websocket-tools` gives you a calmer workflow for debugging all of that:

- inspect connection lifecycle and message history in one place
- filter, search, and group frames across noisy connections
- import previously exported message logs for offline review
- keep everything local in the browser with no required backend service
- save filter presets for repeated searches

## Visual Tour

### Full Panel Overview

<img src="./ScreenShot/ScreenShot-long.png" alt="Full websocket-tools panel" width="100%" />

### Live Traffic Monitoring

<img src="./ScreenShot/Gif/1-monitor-x.gif" alt="Live traffic monitoring" width="100%" />

Track active connections, inspect frame direction, and keep monitoring even when the flow gets noisy.

### JSON Parsing And Nested Editing

<img src="./ScreenShot/Gif/4-JSON.gif" alt="JSON parsing and nested editing" width="100%" />

Format payloads and inspect nested structures when reviewing structured traffic.

## Feature Highlights

### Inspect

- watch WebSocket connections appear in real time
- review connection lifecycle events alongside frame history
- filter and search message data quickly
- save filter presets for repeated searches

### Stay Productive

- built directly into DevTools
- import previously exported frame logs for offline analysis
- keep data local to the browser

## Best Fit Use Cases

- frontend debugging for chat, dashboards, streaming, and collaboration products
- local investigation of noisy high-volume real-time systems
- offline review of exported WebSocket traces

## Quick Start

1. Load the extension build into a Chromium browser.
2. Open any page that uses WebSockets.
3. Press `F12` and open the `websocket-tools` tab.
4. Select a connection from the left panel.
5. Inspect frames, filter by content, and export when needed.

## Local Development

```bash
npm install
npm run build
```

The build flow is cross-platform and works on Windows without relying on `rm -rf`.

## Store Assets

Ready-to-publish store copy is available in [docs/store-copy.md](./docs/store-copy.md).

Brand direction and naming notes are available in [docs/branding.md](./docs/branding.md).

## Upstream Attribution

This project is based on the open-source project [`law-chain-hot/websocket-devtools`](https://github.com/law-chain-hot/websocket-devtools) and includes further modifications and additional features on top of that upstream codebase.

The upstream MIT license notice is retained in this repository.

## License

`websocket-tools` is distributed under the MIT license included in [LICENSE](./LICENSE).
