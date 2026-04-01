# 9. 运行时数据预装配

## 9.1 结论

EasyInk 不再提供表达式引擎。运行时的所有派生值都必须在进入渲染器之前由业务方准备好。

这意味着模板层只保留：

- 绑定哪个字段
- 静态默认值是什么
- data-table 列从哪个对象数组读取

这意味着模板层不再承担：

- 金额、日期、编号等格式化
- 地址、姓名等字段拼接
- 条件显示表达式
- 派生字段计算
- 容器级循环或动态块展开

## 9.2 推荐数据准备方式

```typescript
const preparedDisplayData = {
  orderNo: 'ORD-2024-001',
  amountText: '¥250.00',
  fullAddress: '北京市朝阳区朝阳路 1 号',
  barcodeValue: 'ORD2024001',
  orderItems: [
    { itemName: '商品A', itemQty: '2', itemAmount: '¥200.00' },
    { itemName: '商品B', itemQty: '1', itemAmount: '¥50.00' },
  ],
}

renderer.render(schema, preparedDisplayData, container)
```

## 9.3 数据契约边界

- 只接受扁平字段和一层对象数组。
- 不支持深层对象直接绑定。
- 如果业务原始数据复杂，应在接入前拍平或转成展示值对象。
- 如果业务需要动态块数量变化，应在进入引擎前生成完整 Schema 或完整 materials 列表，而不是要求引擎在渲染期展开。

## 9.4 非目标

以下能力明确不是当前架构目标：

- 沙箱表达式
- helper 函数注入
- 模板级格式化器注册
- 运行时条件渲染脚本
- 在渲染器内部做业务数据清洗
