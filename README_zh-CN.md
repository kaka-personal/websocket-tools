<div align="center">
  <img src="./ScreenShot/ScreenShot-long-quick-radius.png" alt="websocket-tool 总览" width="92%" />

  # websocket-tool

  **直接在 Chrome DevTools 中查看、回放并控制 WebSocket 流量。**

  面向开发者的实时调试工具箱，适合查看消息帧、模拟客户端或服务端消息、拦截噪声流量，并快速复现各种实时通信边界场景。

  [English](./README.md) | **简体中文**
</div>

## 为什么用 websocket-tool

现在很多关键业务逻辑都藏在 WebSocket 流里，比如聊天、AI 流式输出、协作编辑、监控面板、行情推送、通知系统、内部控制通道等。

`websocket-tool` 的目标就是把这些实时流量调试工作变得更直接：

- 在一个面板里查看连接生命周期和消息历史
- 不改业务代码就能回放收发消息
- 按方向拦截流量，复现竞态、掉线和异常状态
- 手动创建连接，做更聚焦的调试
- 把常用 payload 存成收藏，减少重复劳动
- 全流程都在浏览器本地完成，不依赖额外后端

## 功能预览

### 完整面板总览

<img src="./ScreenShot/ScreenShot-long.png" alt="websocket-tool 完整面板" width="100%" />

### 实时流量监控

<img src="./ScreenShot/Gif/1-monitor-x.gif" alt="实时流量监控" width="100%" />

实时查看连接、系统事件和消息方向，在高频流量场景下也能快速定位问题。

### 流量拦截

<img src="./ScreenShot/Gif/2-block-x.gif" alt="流量拦截演示" width="100%" />

按需阻断发送或接收方向，方便复现失败链路、异常状态和临时断流问题。

### 消息模拟

<img src="./ScreenShot/Gif/3-simulation.gif" alt="消息模拟演示" width="100%" />

模拟客户端或服务端消息，不用等真实后端配合，也能快速验证协议处理逻辑。

### JSON 解析与嵌套编辑

<img src="./ScreenShot/Gif/4-JSON.gif" alt="JSON 解析与嵌套编辑" width="100%" />

更方便地查看结构化消息、格式化 JSON，并在调试过程中快速修改 payload。

### 收藏与复用消息

<img src="./ScreenShot/Gif/6-favorites.gif" alt="收藏消息工作流" width="100%" />

把常用消息保存下来，后续调试时可以一键加载和重复发送。

### 系统事件模拟

<img src="./ScreenShot/Gif/7-system_event.gif" alt="系统事件模拟" width="100%" />

直接测试断开连接、关闭码、协议错误等边界场景，不需要专门写后端测试逻辑。

## 核心能力

### 看得清

- 实时查看 WebSocket 连接和消息变化
- 同时查看系统事件与消息历史
- 支持搜索、过滤和快速定位内容

### 放得出

- 分别模拟发送和接收方向
- 支持导入消息到当前连接
- 支持收藏并复用常用 payload

### 控得住

- 可按方向拦截流量
- 便于复现异常链路和边界问题
- 支持手动创建连接做定向调试

### 用得顺

- 直接集成在 DevTools 里
- 适合高频重复调试
- 所有数据都在浏览器本地处理

## 适合哪些场景

- 聊天、仪表盘、流式输出、协作类前端调试
- QA 验证重连、超时、异常 payload、竞态问题
- 后端协议联调和客户端/服务端消息回放
- 高流量实时系统的本地问题排查

## 快速开始

1. 将扩展构建结果加载到 Chromium 浏览器。
2. 打开任意使用 WebSocket 的页面。
3. 按 `F12` 打开开发者工具。
4. 进入 `websocket-tool` 标签页。
5. 选择连接后开始查看消息、模拟 payload 或拦截流量。

## 本地开发

```bash
npm install
npm run build
```

当前构建流程已经兼容 Windows，不依赖 `rm -rf`。

## 商店素材与品牌文档

可直接使用的商店文案见 [docs/store-copy.md](./docs/store-copy.md)。

品牌说明与命名规则见 [docs/branding.md](./docs/branding.md)。

## 上游项目声明

本项目基于开源项目 [`law-chain-hot/websocket-devtools`](https://github.com/law-chain-hot/websocket-devtools) 继续修改而来，并在上游代码基础上增加了额外功能。

本仓库保留了上游 MIT 许可证声明。

## License

`websocket-tool` 使用仓库中的 [LICENSE](./LICENSE) 许可文件。
