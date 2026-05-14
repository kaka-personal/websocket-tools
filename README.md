<div align="center">
  <img src="./ScreenShot/ScreenShot-long-quick-radius.png" alt="websocket-tool overview" width="92%" />

  # websocket-tool

  **Inspect, replay, and control WebSocket traffic directly inside Chrome DevTools.**

  A developer-focused toolbox for viewing live frames, simulating client/server messages, blocking noisy traffic, and reproducing real-time edge cases without touching application code.
</div>

## Why websocket-tool

Modern apps hide critical product logic behind WebSocket streams: chat, dashboards, AI streaming, collaboration, telemetry, trading, notifications, and internal control channels.

`websocket-tool` gives you a calmer workflow for debugging all of that:

- inspect connection lifecycle and message history in one place
- replay inbound or outbound payloads without changing your app
- block send or receive traffic to reproduce race conditions and failures
- create manual connections for focused debugging sessions
- save frequently used payloads as favorites for faster iteration
- keep everything local in the browser with no required backend service

## Visual Tour

### Full Panel Overview

<img src="./ScreenShot/ScreenShot-long.png" alt="Full websocket-tool panel" width="100%" />

### Live Traffic Monitoring

<img src="./ScreenShot/Gif/1-monitor-x.gif" alt="Live traffic monitoring" width="100%" />

Track active connections, inspect frame direction, and keep monitoring even when the flow gets noisy.

### Traffic Blocking

<img src="./ScreenShot/Gif/2-block-x.gif" alt="Traffic blocking demo" width="100%" />

Pause the chaos when you need to reproduce broken states, dropped sends, or blocked receives.

### Message Simulation

<img src="./ScreenShot/Gif/3-simulation.gif" alt="Message simulation demo" width="100%" />

Replay client-side and server-side payloads to verify protocol handling without waiting for the real backend to cooperate.

### JSON Parsing And Nested Editing

<img src="./ScreenShot/Gif/4-JSON.gif" alt="JSON parsing and nested editing" width="100%" />

Format payloads, inspect nested structures, and iterate on messages faster when debugging structured traffic.

### Favorites And Reusable Payloads

<img src="./ScreenShot/Gif/6-favorites.gif" alt="Favorites workflow" width="100%" />

Store common payloads and replay them in a few clicks during repetitive testing cycles.

### System Event Simulation

<img src="./ScreenShot/Gif/7-system_event.gif" alt="System event simulation" width="100%" />

Test disconnects, close codes, protocol failures, and other real-time edge cases without wiring up special backend logic.

## Feature Highlights

### Inspect

- watch WebSocket connections appear in real time
- review connection lifecycle events alongside frame history
- filter and search message data quickly

### Replay

- simulate send and receive directions independently
- import payloads into the current connection
- reuse saved favorites to speed up test cycles

### Control

- block outbound or inbound traffic selectively
- reproduce broken sessions and interrupted flows
- manually create connections for isolated debugging

### Stay Productive

- built directly into DevTools
- optimized for repeated debugging sessions
- keeps data local to the browser

## Best Fit Use Cases

- frontend debugging for chat, dashboards, streaming, and collaboration products
- QA validation of reconnect, timeout, malformed payload, and race-condition scenarios
- backend and protocol testing with repeatable client/server message playback
- local investigation of noisy high-volume real-time systems

## Quick Start

1. Load the extension build into a Chromium browser.
2. Open any page that uses WebSockets.
3. Press `F12` and open the `websocket-tool` tab.
4. Select a connection from the left panel.
5. Inspect messages, replay payloads, or block traffic as needed.

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

`websocket-tool` is distributed under the MIT license included in [LICENSE](./LICENSE).
