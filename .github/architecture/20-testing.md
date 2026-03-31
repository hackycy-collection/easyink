# 20. 测试策略

## 20.1 单元测试（Vitest）

覆盖核心引擎的所有纯逻辑模块：

| 模块 | 测试重点 |
|------|----------|
| SchemaEngine | Schema CRUD、校验、遍历、序列化 |
| LayoutEngine | 绝对定位计算、流式布局排列、混合布局、auto-extend 溢出计算 |
| ExpressionEngine | 沙箱安全性、表达式求值正确性、超时处理 |
| DataResolver | 扁平路径解析、点路径解析、格式化器、容错策略 |
| CommandManager | 撤销/重做、命令合并、事务 |
| UnitManager | 单位转换精度 |
| MigrationRegistry | 版本迁移链路 |

## 20.2 E2E 测试（Playwright）

覆盖关键用户路径：

```
1. 加载模板 → 填充数据 → 渲染预览 → 验证输出
2. 设计器打开 → 添加元素 → 设置属性 → 导出 Schema
3. 设计器打开 → 多次操作 → 撤销/重做 → 验证状态
4. 加载包含数据表格的模板 → 填充大量数据 → 验证 auto-extend 输出高度
5. 加载模板 → 生成 PDF → 验证 PDF 产物
```

## 20.3 测试工具

```jsonc
// vitest.config.ts
{
  "test": {
    "workspace": [
      "packages/core",
      "packages/renderer",
      "packages/designer"
    ]
  }
}
```
