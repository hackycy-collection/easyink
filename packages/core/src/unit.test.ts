import { describe, expect, it } from 'vitest'
import { UnitManager } from './unit'

describe('unitManager', () => {
  describe('toPixels / fromPixels', () => {
    it('converts mm to pixels at 96 dpi', () => {
      const mgr = new UnitManager('mm')
      // 25.4mm = 1 inch = 96px at 96dpi
      const px = mgr.toPixels(25.4)
      expect(Math.round(px)).toBe(96)
    })

    it('converts pixels back to mm', () => {
      const mgr = new UnitManager('mm')
      const mm = mgr.fromPixels(96)
      expect(Math.round(mm * 10) / 10).toBe(25.4)
    })

    it('converts pt to pixels at 96 dpi', () => {
      const mgr = new UnitManager('pt')
      // 72pt = 1 inch = 96px
      const px = mgr.toPixels(72)
      expect(Math.round(px)).toBe(96)
    })

    it('converts pixels back to pt', () => {
      const mgr = new UnitManager('pt')
      const pt = mgr.fromPixels(96)
      expect(Math.round(pt)).toBe(72)
    })

    it('converts px to pixels (1:1 at 96 dpi)', () => {
      const mgr = new UnitManager('px')
      expect(mgr.toPixels(100)).toBe(100)
      expect(mgr.fromPixels(100)).toBe(100)
    })
  })

  describe('convert between units', () => {
    it('converts mm to pt', () => {
      const mgr = new UnitManager('mm')
      const pt = mgr.convert(25.4, 'mm', 'pt')
      expect(Math.round(pt)).toBe(72)
    })

    it('converts pt to mm', () => {
      const mgr = new UnitManager('pt')
      const mm = mgr.convert(72, 'pt', 'mm')
      expect(Math.round(mm * 10) / 10).toBe(25.4)
    })

    it('same-unit conversion returns same value', () => {
      const mgr = new UnitManager('mm')
      expect(mgr.convert(10, 'mm', 'mm')).toBe(10)
    })

    it('converts mm to px', () => {
      const mgr = new UnitManager('mm')
      const px = mgr.convert(25.4, 'mm', 'px')
      expect(Math.round(px)).toBe(96)
    })
  })

  describe('screenToDocument / documentToScreen', () => {
    it('screenToDocument converts screen px to doc units', () => {
      const mgr = new UnitManager('mm')
      // At zoom=1, canvasOffset=0, scrollOffset=0
      const docValue = mgr.screenToDocument(96, 0, 0, 1)
      expect(Math.round(docValue * 10) / 10).toBe(25.4)
    })

    it('documentToScreen converts doc units to screen px', () => {
      const mgr = new UnitManager('mm')
      const screenPx = mgr.documentToScreen(25.4, 0, 0, 1)
      expect(Math.round(screenPx)).toBe(96)
    })

    it('round-trips through both conversions', () => {
      const mgr = new UnitManager('mm')
      const offset = 50
      const scroll = 20
      const zoom = 1.5
      const original = 100

      const screen = mgr.documentToScreen(original, offset, scroll, zoom)
      const back = mgr.screenToDocument(screen, offset, scroll, zoom)
      expect(Math.round(back * 100) / 100).toBe(original)
    })
  })
})
