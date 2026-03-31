# 22. 安全模型

## 22.1 表达式沙箱

- 表达式在受限作用域中执行，无法访问 `window`、`document`、`globalThis`
- 白名单全局对象：`Math`、`Date`、`Number`、`String`、`Array`、`Object`、`JSON`
- 禁止的语法：函数声明、箭头函数、new 表达式、import 表达式、赋值表达式
- 执行超时：100ms
- 递归深度限制：10 层

## 22.2 数据源安全

- 数据路径解析器防止原型链污染（禁止访问 `__proto__`、`constructor`、`prototype`）
- 格式化器只能是注册的白名单函数

## 22.3 渲染安全

- 动态数据插入 DOM 时使用 `textContent` 而非 `innerHTML`
- 富文本内容经过 sanitize 处理
- 图片 URL 支持白名单域名配置
