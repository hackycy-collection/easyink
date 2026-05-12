import process from 'node:process'
import { defineConfig } from 'vitepress'

const base = process.env.EASYINK_DOCS_BASE ?? '/'

export default defineConfig({
  base,
  title: 'EasyInk',
  description: 'EasyInk - Print is Easy',
  head: [
    ['link', { rel: 'icon', href: `${base}logo.ico` }],
  ],
  vite: {
    server: {
      port: 8533,
    },
  },

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: 'Designer', link: '/designer/' },
      { text: 'Viewer', link: '/viewer/' },
      { text: '.NET', link: '/dotnet/' },
      { text: '进阶', link: '/advanced/print-drivers' },
      { text: 'API', link: '/api/' },
      { text: '在线演示', link: 'https://hackycy.github.io/easyink' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速上手', link: '/guide/getting-started' },
            { text: '核心概念', link: '/guide/concepts' },
            { text: '包概览', link: '/guide/packages' },
          ],
        },
      ],
      '/designer/': [
        {
          text: 'Designer',
          items: [
            { text: '概述', link: '/designer/' },
            { text: '键盘快捷键', link: '/designer/keyboard-shortcuts' },
            { text: '数据绑定', link: '/designer/data-binding' },
            { text: '自动保存', link: '/designer/auto-save' },
            { text: '自定义物料', link: '/designer/materials' },
            { text: '贡献扩展', link: '/designer/contributions' },
          ],
        },
      ],
      '/viewer/': [
        {
          text: 'Viewer',
          items: [
            { text: '概述', link: '/viewer/' },
            { text: 'Host 模式', link: '/viewer/viewer-hosts' },
            { text: '打印与导出', link: '/viewer/print-export' },
            { text: '自定义物料', link: '/viewer/custom-materials' },
            { text: '诊断', link: '/viewer/diagnostics' },
          ],
        },
      ],
      '/dotnet/': [
        {
          text: '.NET 打印服务',
          items: [
            { text: '概述', link: '/dotnet/' },
            { text: '快速上手', link: '/dotnet/getting-started' },
            { text: 'Engine DLL', link: '/dotnet/engine' },
            { text: 'Printer 应用', link: '/dotnet/printer' },
            { text: 'API 参考', link: '/dotnet/api-reference' },
          ],
        },
      ],
      '/advanced/': [
        {
          text: '进阶',
          items: [
            { text: '自定义打印驱动', link: '/advanced/print-drivers' },
            { text: '自定义导出插件', link: '/advanced/exporters' },
            { text: 'Schema 参考', link: '/advanced/schema' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API',
          items: [
            { text: '索引', link: '/api/' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/hackycy/easyink' },
    ],
  },
})
