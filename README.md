<div align="center">

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

<img src="./ScreenShot/1.png" alt="websocket-tools 完整面板" width="100%" />
<img src="./ScreenShot/2.png" alt="websocket-tools 完整面板" width="100%" />
<img src="./ScreenShot/3.png" alt="websocket-tools 完整面板" width="100%" />

Format payloads and inspect nested structures when reviewing structured traffic.

## Feature Highlights

### Connections & Messages

- watch every WebSocket connection on the page in real time
- review connection lifecycle events alongside frame history
- system events (open / close / error) get their own tab
- clear messages for the current connection or wipe all connections
- automatic circuit-breaker pause when message rate spikes, so the panel never floods

### Message Viewing

- automatic JSON detection with collapsible / expandable tree view
- nested JSON parsing — JSON embedded inside string payloads is still expandable

### Search & Filter

- full-text filter across message content
- save the current filter as a named Filter Favorite and reuse it any time

### Import & Export

- one-click export of all messages for the current connection
- import a previously exported log back into the current connection for offline review

### Other

- localized UI (English, 简体中文, 繁體中文, 日本語, 한국어, Français, Deutsch)
- fully local — no backend service required
- runs inside Chrome DevTools, no extra window needed

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


## Upstream Attribution

This project is based on the open-source project [`law-chain-hot/websocket-devtools`](https://github.com/law-chain-hot/websocket-devtools) and includes further modifications and additional features on top of that upstream codebase.

The upstream MIT license notice is retained in this repository.

## License

`websocket-tools` is distributed under the MIT license included in [LICENSE](./LICENSE).
