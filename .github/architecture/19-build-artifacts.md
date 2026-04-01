# 19. 构建与产物

## 19.1 构建工具链

| 工具 | 用途 |
|------|------|
| **tsdown** | 主构建工具，打包各 package 为 ESM 产物 |
| **rollup-plugin-vue** | Vue SFC 编译（设计器包） |
| **Vite** | playground/examples 的开发服务器 |
| **TypeScript** | 类型检查（noEmit，声明文件由 tsdown 生成） |

## 19.2 产物格式

仅输出 **ESM** 格式：

```
packages/core/dist/
  ├── index.mjs
  ├── index.d.mts
  └── chunks/

packages/renderer/dist/
  ├── index.mjs
  ├── index.d.mts
  └── chunks/

packages/designer/dist/
  ├── index.mjs
  ├── index.d.mts
  └── style.css
```

## 19.3 Package.json 导出配置

```jsonc
// packages/core/package.json
{
  "name": "@easyink/core",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.mts"
    }
  },
  "files": ["dist"]
}

// packages/renderer/package.json
{
  "name": "@easyink/renderer",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.mts"
    }
  }
}
```

## 19.4 当前不导出的能力

- `@easyink/renderer/pdf`
- `@easyink/renderer/print`
- `@easyink/renderer/image`

这些子路径若未来重新引入，应作为独立扩展包或独立入口，而不是默认核心产物的一部分。
