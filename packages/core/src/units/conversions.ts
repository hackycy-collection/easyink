import type { Unit } from './types'

/** 单位互转系数 */
export const UNIT_CONVERSIONS = {
  mm: { toInch: 1 / 25.4, toPt: 72 / 25.4 },
  inch: { toMm: 25.4, toPt: 72 },
  pt: { toMm: 25.4 / 72, toInch: 1 / 72 },
} as const

/**
 * 在不同单位之间转换数值
 */
export function convert(value: number, from: Unit, to: Unit): number {
  if (from === to)
    return value

  // 先转为 mm，再转为目标单位
  let mm: number
  switch (from) {
    case 'mm':
      mm = value
      break
    case 'inch':
      mm = value * UNIT_CONVERSIONS.inch.toMm
      break
    case 'pt':
      mm = value * UNIT_CONVERSIONS.pt.toMm
      break
  }

  switch (to) {
    case 'mm':
      return mm
    case 'inch':
      return mm * UNIT_CONVERSIONS.mm.toInch
    case 'pt':
      return mm * UNIT_CONVERSIONS.mm.toPt
  }
}

/**
 * 将模板单位值转换为 CSS 像素值
 * @param value - 模板单位值
 * @param unit - 单位类型
 * @param dpi - 屏幕 DPI（默认 96）
 * @param zoom - 缩放倍率（默认 1）
 */
export function toPixels(value: number, unit: Unit, dpi: number = 96, zoom: number = 1): number {
  switch (unit) {
    case 'mm':
      return value * (dpi / 25.4) * zoom
    case 'inch':
      return value * dpi * zoom
    case 'pt':
      return value * (dpi / 72) * zoom
  }
}

/**
 * 将 CSS 像素值转换回模板单位值
 */
export function fromPixels(px: number, unit: Unit, dpi: number = 96, zoom: number = 1): number {
  switch (unit) {
    case 'mm':
      return px / (dpi / 25.4) / zoom
    case 'inch':
      return px / dpi / zoom
    case 'pt':
      return px / (dpi / 72) / zoom
  }
}
