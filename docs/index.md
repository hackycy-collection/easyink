---
layout: home

hero:
  name: EasyInk
  text: Print is Easy
  tagline: 面向开发者的文档/报表设计器框架。基于 Vue 3 + TypeScript，提供可嵌入的设计器与预览器。
  image:
    src: /logo.png
    alt: EasyInk Logo
  actions:
    - theme: brand
      text: 快速上手
      link: /guide/getting-started
    - theme: alt
      text: Designer 文档
      link: /designer/
    - theme: alt
      text: Viewer 文档
      link: /viewer/

features:
  - title: 设计器开箱即用
    details: 完整的文档设计器工作台，支持拖拽编辑、物料系统、数据绑定、对齐吸附、撤销重做。通过一个 Vue 组件即可嵌入你的应用。
  - title: 预览器独立运行
    details: 接收 Schema + 数据即可渲染、分页、打印、导出 PDF。支持 iframe 隔离、自定义打印驱动、插件化导出。
  - title: 可扩展的物料体系
    details: 每个物料由 Schema 定义、设计器交互、Viewer 渲染三部分组成。通过 registerMaterialBundle 注册自定义物料。
  - title: 贡献扩展机制
    details: 通过 Contribution API 向设计器注入自定义面板、工具栏按钮和命令，零侵入扩展设计器能力。
---
