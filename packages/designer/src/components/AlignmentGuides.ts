import type { DesignerContext } from '../types'
import { toPixels } from '@easyink/core'
import { defineComponent, h, inject } from 'vue'
import { DESIGNER_INJECTION_KEY } from '../types'
import { getCanvasContentMetrics } from '../utils/canvas-metrics'

export const AlignmentGuides = defineComponent({
  name: 'AlignmentGuides',
  setup() {
    const ctx = inject(DESIGNER_INJECTION_KEY) as DesignerContext

    function toPx(value: number): number {
      const unit = ctx.engine.schema.schema.page.unit
      return toPixels(value, unit, 96, ctx.canvas.zoom.value)
    }

    function getContentMetrics() {
      const page = ctx.engine.schema.schema.page
      const unit = page.unit
      const zoom = ctx.canvas.zoom.value
      const dims = ctx.engine.layout.resolvePageDimensions(page)
      return getCanvasContentMetrics({
        contentHeight: toPixels(dims.height - page.margins.top - page.margins.bottom, unit, 96, zoom),
        contentWidth: toPixels(dims.width - page.margins.left - page.margins.right, unit, 96, zoom),
        marginOffsetX: toPixels(page.margins.left, unit, 96, zoom),
        marginOffsetY: toPixels(page.margins.top, unit, 96, zoom),
      })
    }

    return () => {
      const renderVersion = ctx.canvas.renderVersion.value
      void renderVersion
      const lines = ctx.snapping.activeSnapLines.value
      const metrics = getContentMetrics()

      return h('div', {
        class: 'easyink-alignment-guides',
        style: {
          height: `${metrics.contentHeight}px`,
          left: `${metrics.offsetX}px`,
          top: `${metrics.offsetY}px`,
          width: `${metrics.contentWidth}px`,
        },
      }, lines.map((line, i) => {
        const px = toPx(line.position)
        const style = line.orientation === 'vertical'
          ? {
              height: '100%',
              left: `${px}px`,
              position: 'absolute' as const,
              top: '0',
              width: '1px',
            }
          : {
              height: '1px',
              left: '0',
              position: 'absolute' as const,
              top: `${px}px`,
              width: '100%',
            }
        return h('div', {
          class: `easyink-snap-line easyink-snap-line--${line.orientation}`,
          key: i,
          style,
        })
      }))
    }
  },
})
