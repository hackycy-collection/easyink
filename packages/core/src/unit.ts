import type { UnitType } from '@easyink/shared'
import { UNIT_CONVERSIONS, UNIT_FACTOR } from '@easyink/shared'

/**
 * UnitManager handles conversions between document units and screen pixels.
 * The render path uses CSS physical units directly; this class is for:
 * - Designer mouse interaction coordinate conversion
 * - Ruler scale rendering
 * - Property panel value formatting
 * - Unit-switch batch schema value conversion
 */
export class UnitManager {
  constructor(public readonly unit: UnitType) {}

  /**
   * Convert document units to screen pixels.
   */
  toPixels(value: number, dpi = 96, zoom = 1): number {
    const factor = UNIT_FACTOR[this.unit] || 96
    return value * (dpi / factor) * zoom
  }

  /**
   * Convert screen pixels to document units.
   */
  fromPixels(px: number, dpi = 96, zoom = 1): number {
    const factor = UNIT_FACTOR[this.unit] || 96
    return px / (dpi / factor) / zoom
  }

  /**
   * Convert a value from one unit to another.
   */
  convert(value: number, from: UnitType, to: UnitType): number {
    if (from === to)
      return value

    // Convert to mm first, then to target
    let mm: number
    switch (from) {
      case 'mm':
        mm = value
        break
      case 'pt':
        mm = value * UNIT_CONVERSIONS.pt.toMm
        break
      case 'px':
        mm = value * (25.4 / 96)
        break
      default:
        mm = value
    }

    switch (to) {
      case 'mm':
        return mm
      case 'pt':
        return mm * UNIT_CONVERSIONS.mm.toPt
      case 'px':
        return mm * (96 / 25.4)
      default:
        return mm
    }
  }

  /**
   * Format a value for display with appropriate precision.
   */
  format(value: number, precision = 2): string {
    return value.toFixed(precision)
  }

  /**
   * Convert screen pixel coordinate to document unit coordinate.
   * For mouse interaction in the designer canvas.
   */
  screenToDocument(
    screenPx: number,
    canvasOffset: number,
    scrollOffset: number,
    zoom: number,
  ): number {
    const factor = UNIT_FACTOR[this.unit] || 96
    const cssPixelsPerUnit = 96 / factor
    return (screenPx - canvasOffset + scrollOffset) / zoom / cssPixelsPerUnit
  }

  /**
   * Convert document unit coordinate to screen pixel coordinate.
   */
  documentToScreen(
    unitValue: number,
    canvasOffset: number,
    scrollOffset: number,
    zoom: number,
  ): number {
    const factor = UNIT_FACTOR[this.unit] || 96
    const cssPixelsPerUnit = 96 / factor
    return unitValue * cssPixelsPerUnit * zoom + canvasOffset - scrollOffset
  }
}
