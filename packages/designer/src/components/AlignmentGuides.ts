import type { DesignerContext } from '../types'
import { toPixels } from '@easyink/core'
import { defineComponent, h, inject } from 'vue'
import { DESIGNER_INJECTION_KEY } from '../types'

export const AlignmentGuides = defineComponent({
  name: 'AlignmentGuides',
  setup() {
    const ctx = inject(DESIGNER_INJECTION_KEY) as DesignerContext

    function toPx(value: number): number {
      const unit = ctx.engine.schema.schema.page.unit
      return toPixels(value, unit, 96, ctx.canvas.zoom.value)
    }

    function getPageWrapperPadding(): { x: number, y: number } {
      const wrapper = document.querySelector('.easyink-canvas-page-wrapper')
      if (!wrapper) {
        return { x: 0, y: 0 }
      }
      const styles = getComputedStyle(wrapper)
      return {
        x: Number.parseFloat(styles.paddingLeft) || 0,
        y: Number.parseFloat(styles.paddingTop) || 0,
      }
    }

    return () => {
      const lines = ctx.snapping.activeSnapLines.value
      const { margins } = ctx.engine.schema.schema.page
      const padding = getPageWrapperPadding()
      const offsetX = padding.x + toPx(margins.left)
      const offsetY = padding.y + toPx(margins.top)

      return h('div', {
        class: 'easyink-alignment-guides',
        style: {
          left: `${offsetX}px`,
          top: `${offsetY}px`,
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
