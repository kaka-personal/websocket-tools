<div align="center">
  <img src="./ScreenShot/ScreenShot-long-quick-radius.png" alt="websocket-tool 总览" width="92%" />

  # websocket-tool

  **直接在 Chrome DevTools 中查看 WebSocket 流量。**

  一个只读的开发者面板，用来观察实时消息帧、回顾连接生命周期、并对噪声流量做过滤和搜索——不需要改任何业务代码。

  [English](./README.md) | **简体中文**
</div>

## 为什么用 websocket-tool

现在很多关键业务逻辑都藏在 WebSocket 流里,比如聊天、AI 流式输出、协作编辑、监控面板、行情推送、通知系统、内部控制通道等。

`websocket-tool` 的目标就是把这些实时流量的观察工作变得更直接:

- 在一个面板里查看连接生命周期和消息历史
- 跨连接做过滤、搜索、分组,屏蔽噪声
- 支持导入之前导出的消息日志做离线分析
- 全流程都在浏览器本地完成,不依赖额外后端

## 功能预览

### 完整面板总览

<img src="./ScreenShot/ScreenShot-long.png" alt="websocket-tool 完整面板" width="100%" />

### 实时流量监控

<img src="./ScreenShot/Gif/1-monitor-x.gif" alt="实时流量监控" width="100%" />

实时查看连接、系统事件和消息方向，在高频流量场景下也能快速定位问题。

### JSON 解析与嵌套编辑

<img src="./ScreenShot/Gif/4-JSON.gif" alt="JSON 解析与嵌套编辑" width="100%" />

更方便地查看结构化消息、格式化 JSON,辅助阅读嵌套字段。

## 核心能力

### 看得清

- 实时查看 WebSocket 连接和消息变化
- 同时查看系统事件与消息历史
- 支持搜索、过滤和快速定位内容
- 支持保存过滤预设,反复使用

### 用得顺

- 直接集成在 DevTools 里
- 支持导入之前导出的消息日志做离线分析
- 所有数据都在浏览器本地处理

## 适合哪些场景

- 聊天、仪表盘、流式输出、协作类前端调试
- 高流量实时系统的本地问题排查
- 复盘之前导出的 WebSocket 抓包数据

## 快速开始

1. 将扩展构建结果加载到 Chromium 浏览器。
2. 打开任意使用 WebSocket 的页面。
3. 按 `F12` 打开开发者工具。
4. 进入 `websocket-tool` 标签页。
5. 选择连接后开始查看、过滤消息,或按需导出。

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
