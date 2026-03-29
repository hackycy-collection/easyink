import type { DataSourceRegistration } from '@easyink/core'

/**
 * 示例数据源定义 — 订单数据 + 公司信息
 */
export const sampleDataSources: Array<{ name: string } & DataSourceRegistration> = [
  {
    name: '订单数据',
    displayName: '订单数据',
    fields: [
      { key: 'orderNo', title: '订单号' },
      {
        title: '客户信息',
        children: [
          { key: 'customerName', title: '客户名称' },
          { key: 'customerPhone', title: '联系电话' },
          { key: 'customerAddress', title: '客户地址' },
        ],
      },
      {
        title: '订单明细',
        children: [
          { key: 'itemName', title: '商品名称', fullPath: 'orderItems.itemName' },
          { key: 'itemQty', title: '数量', fullPath: 'orderItems.itemQty' },
          { key: 'itemPrice', title: '单价', fullPath: 'orderItems.itemPrice' },
          { key: 'itemAmount', title: '金额', fullPath: 'orderItems.itemAmount' },
        ],
      },
      { key: 'orderDate', title: '下单日期' },
      { key: 'orderTotal', title: '订单总额' },
    ],
  },
  {
    name: '公司信息',
    displayName: '公司信息',
    fields: [
      { key: 'companyName', title: '公司名称' },
      { key: 'companyAddress', title: '公司地址' },
      { key: 'companyPhone', title: '公司电话' },
      { key: 'companyLogo', title: '公司Logo' },
    ],
  },
]

/**
 * 示例填充数据
 */
export const sampleData: Record<string, unknown> = {
  orderNo: 'ORD-2024-001',
  customerName: '张三',
  customerPhone: '13800138000',
  customerAddress: '北京市朝阳区建国路88号',
  orderDate: '2024-06-15',
  orderTotal: 580,
  companyName: 'ACME 科技有限公司',
  companyAddress: '上海市浦东新区陆家嘴环路999号',
  companyPhone: '021-12345678',
  companyLogo: 'https://via.placeholder.com/200x60?text=ACME+Logo',
  orderItems: [
    { itemName: '无线蓝牙耳机', itemQty: 2, itemPrice: 199, itemAmount: 398 },
    { itemName: 'USB-C 数据线', itemQty: 3, itemPrice: 29, itemAmount: 87 },
    { itemName: '手机支架', itemQty: 1, itemPrice: 59, itemAmount: 59 },
    { itemName: '屏幕清洁套装', itemQty: 2, itemPrice: 18, itemAmount: 36 },
  ],
}
