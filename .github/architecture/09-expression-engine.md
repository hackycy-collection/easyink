# 9. 表达式引擎

## 9.1 可插拔架构

核心只提供路径绑定（`key` 直接取值 + `arrayKey.field` 点路径解析），表达式引擎作为插件扩展：

> **设计决策**：核心不内置 SimplePathEngine 默认实现--路径解析已由 `DataResolver.resolve()` 完成（扁平取值 + arrayKey.field 点路径）。`ExpressionEngine` 接口定义在 `@easyink/core` 中，实际引擎实现（如支持 `price * quantity` 的沙箱化引擎）由插件提供。核心仅导出接口类型 + `DEFAULT_SANDBOX_CONFIG` 默认值。

```typescript
/**
 * 表达式引擎接口 -- 由插件实现
 */
interface ExpressionEngine {
  /** 引擎标识 */
  readonly name: string

  /**
   * 编译表达式为可执行函数
   * @param expression - 表达式字符串，如 "price * quantity"
   * @returns 编译后的执行函数
   */
  compile(expression: string): CompiledExpression

  /**
   * 执行已编译的表达式
   * @param compiled - 编译结果
   * @param context - 数据上下文（沙箱化）
   */
  execute(compiled: CompiledExpression, context: ExpressionContext): unknown

  /**
   * 校验表达式语法
   */
  validate(expression: string): ValidationResult
}

interface ExpressionContext {
  /** 数据源数据（标量 + 对象数组混合） */
  data: Record<string, unknown>
  /** 白名单工具函数 */
  helpers: Record<string, (...args: unknown[]) => unknown>
}
```

## 9.2 沙箱化执行

默认的表达式引擎必须在受限沙箱中执行，安全策略：

```typescript
interface SandboxConfig {
  /** 允许访问的全局对象白名单 */
  allowedGlobals: string[]  // 默认: ['Math', 'Date', 'Number', 'String', 'Array', 'Object', 'JSON']

  /** 禁止的语法结构 */
  disallowedSyntax: string[]  // 默认: ['FunctionExpression', 'ArrowFunctionExpression', 'NewExpression', 'ImportExpression']

  /** 最大执行时间（ms） */
  timeout: number  // 默认: 100

  /** 最大递归深度 */
  maxDepth: number  // 默认: 10
}
```

实现策略：
- 使用 AST 解析表达式，拦截危险语法
- 在 `new Function()` 的受限作用域中执行，不暴露 `window`/`globalThis`
- 表达式只能访问数据上下文和白名单 helper 函数
- 对无限循环/深递归设置执行超时

## 9.3 内置格式化器

```typescript
// 内置格式化器类型
type BuiltinFormatters =
  | { type: 'currency', options: { locale?: string, currency?: string, decimals?: number } }
  | { type: 'date', options: { format: string } }  // e.g. 'YYYY-MM-DD'
  | { type: 'number', options: { decimals?: number, thousandsSeparator?: boolean } }
  | { type: 'uppercase' }
  | { type: 'lowercase' }
  | { type: 'pad', options: { length: number, char?: string, direction?: 'left' | 'right' } }
```
