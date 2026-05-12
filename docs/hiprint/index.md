# Electron HiPrint

基于 [vue-plugin-hiprint](https://github.com/CcSimple/vue-plugin-hiprint) + [electron-hiprint](https://github.com/CcSimple/electron-hiprint) 的跨平台静默打印方案。

## 架构

```
浏览器 (Vue 前端)
    │  WebSocket (vue-plugin-hiprint)
    ▼
electron-hiprint 客户端        ← 本地 Node.js/Electron 服务，默认端口 17521
    │
    ▼
系统打印机驱动                  ← Chromium 调用 OS 打印通道
```

前端通过 `vue-plugin-hiprint` 将 HTML 内容发送到本地运行的 `electron-hiprint` 客户端，由客户端调用系统打印机完成打印。

## 下一步

- [快速上手](./getting-started) -- 环境搭建、与 EasyInk Viewer 集成
