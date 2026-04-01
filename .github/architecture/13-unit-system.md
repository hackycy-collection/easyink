# 13. 单位系统

## 13.1 设计决策

**Schema 存储用户选择的单位值**，不做归一化转换。`page.unit` 声明了整个模板使用的单位，所有元素的坐标和尺寸数值都基于该单位。

```typescript
// Schema 中的存储方式
{
  page: {
    unit: 'mm',            // 用户选择的单位
    paper: { type: 'custom', width: 210, height: 297 },  // 值的单位是 mm
    margins: { top: 10, right: 10, bottom: 10, left: 10 }, // 值的单位是 mm
  },
  materials: [{
    layout: { x: 15, y: 20, width: 50, height: 10 }, // 值的单位是 mm
  }]
}
```

## 13.2 单位管理器

```typescript
class UnitManager {
  /** 当前模板单位 */
  readonly unit: 'mm' | 'inch' | 'pt'

  /**
   * 将模板单位值转换为屏幕像素值
   * @param value - 模板单位值
   * @param dpi - 屏幕 DPI（默认 96）
   * @param zoom - 缩放倍率
   */
  toPixels(value: number, dpi?: number, zoom?: number): number

  /**
   * 将屏幕像素值转换回模板单位值
   */
  fromPixels(px: number, dpi?: number, zoom?: number): number

  /**
   * 单位间转换
   */
  convert(value: number, from: Unit, to: Unit): number

  /**
   * 获取显示用的格式化值（带单位后缀）
   */
  format(value: number, precision?: number): string
}

// 转换常量
const UNIT_CONVERSIONS = {
  mm: { toInch: 1 / 25.4, toPt: 72 / 25.4 },
  inch: { toMm: 25.4, toPt: 72 },
  pt: { toMm: 25.4 / 72, toInch: 1 / 72 },
} as const
```

## 13.3 渲染时转换

DOM 渲染时需要将模板单位转换为 CSS 像素：

```
模板值 (mm/inch/pt) → CSS 像素 (px)

公式:
  mm → px:   value * (DPI / 25.4) * zoom
  inch → px: value * DPI * zoom
  pt → px:   value * (DPI / 72) * zoom

设计器画布中 DPI 固定为 96（CSS 标准），zoom 由缩放控制。
业务侧若继续做打印或导出，可自行选择目标 DPI（例如 300）。
```
