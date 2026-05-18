<div align="center">

<img src="./ScreenShot/home.png" alt="websocket-tools" width="100%" />

  # websocket-tools

  **直接在 Chrome DevTools 中查看 WebSocket 流量。**

  这是一个只读的开发者面板，用来查看实时消息帧、回顾连接生命周期，并对噪声流进行过滤和检索，不需要改动业务代码。

  [English](./README.md) | **简体中文**
</div>

## 为什么用 websocket-tools

现在很多关键业务逻辑都藏在 WebSocket 流里，比如聊天、看板、AI 流式输出、协作、遥测、交易、通知和内部控制通道。

`websocket-tools` 的目标就是把这些实时流量的排查工作变得更直接：

- 在一个面板里查看连接生命周期和消息历史
- 对噪声连接进行过滤、搜索和分组
- 导入之前导出的消息日志，便于离线分析
- 所有数据都保留在浏览器本地，不依赖后端服务
- 保存筛选收藏，方便重复搜索

## 功能预览

<img src="./ScreenShot/1.png" alt="websocket-tools 完整面板" width="100%" />
<img src="./ScreenShot/2.png" alt="websocket-tools 完整面板" width="100%" />
<img src="./ScreenShot/3.png" alt="websocket-tools 完整面板" width="100%" />

更方便地查看结构化消息、格式化 JSON，并辅助阅读嵌套字段。

## 核心能力

### 连接与消息

- 实时查看页面内所有 WebSocket 连接
- 同时查看连接生命周期事件和消息历史
- 系统事件单独成 Tab（open / close / error 等）
- 一键清空当前连接的消息或全部连接
- 高消息速率时自动熔断暂停，避免面板刷爆

### 消息查看

- 自动识别 JSON 并提供折叠 / 展开
- 嵌套 JSON 解析：字符串里的 JSON 也能继续展开

### 搜索与过滤

- 按文本内容全文过滤消息
- 支持把当前过滤条件保存为命名收藏（Filter Favorites），随时复用

### 数据导入导出

- 一键导出当前连接的全部消息为日志文件
- 导入之前导出的日志到当前连接，便于离线复盘

### 其他

- 多语言界面（简体中文、繁體中文、English、日本語、한국어、Français、Deutsch）
- 纯本地处理，不依赖任何后端服务
- 直接集成在 Chrome DevTools 中，无需额外窗口

## 适合哪些场景

- 聊天、仪表盘、流式输出、协作类前端调试
- 高频实时系统的本地问题排查
- 导出的 WebSocket 抓包数据离线复盘

## 快速开始

1. 将构建产物加载到 Chromium 浏览器中。
2. 打开任意使用 WebSocket 的页面。
3. 按 `F12` 打开开发者工具。
4. 进入 `websocket-tools` 标签页。
5. 选择连接后查看消息，按需筛选和导出。

## 本地开发

```bash
npm install
npm run build
```

当前构建流程兼容 Windows，不依赖 `rm -rf`。



## 上游说明

本项目基于开源项目 [`law-chain-hot/websocket-devtools`](https://github.com/law-chain-hot/websocket-devtools) 继续修改而来，并在上游代码基础上增加了额外功能。

本仓库保留了上游 MIT 许可声明。

## License

`websocket-tools` 使用仓库中的 [LICENSE](./LICENSE) 许可文件。
