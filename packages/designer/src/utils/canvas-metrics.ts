export interface CanvasContentMetricsFallback {
  contentHeight: number
  contentWidth: number
  marginOffsetX: number
  marginOffsetY: number
}

export interface CanvasContentMetrics {
  contentHeight: number
  contentWidth: number
  originClientX: number
  originClientY: number
  offsetX: number
  offsetY: number
}

function parsePx(value?: string): number {
  return Number.parseFloat(value ?? '') || 0
}

function getWrapperPadding(wrapper: HTMLElement): { x: number, y: number } {
  const styles = getComputedStyle(wrapper)
  return {
    x: parsePx(styles.paddingLeft),
    y: parsePx(styles.paddingTop),
  }
}

export function getCanvasContentMetrics(fallback: CanvasContentMetricsFallback): CanvasContentMetrics {
  const wrapper = document.querySelector('.easyink-canvas-page-wrapper') as HTMLElement | null
  if (!wrapper) {
    return {
      contentHeight: fallback.contentHeight,
      contentWidth: fallback.contentWidth,
      originClientX: fallback.marginOffsetX,
      originClientY: fallback.marginOffsetY,
      offsetX: fallback.marginOffsetX,
      offsetY: fallback.marginOffsetY,
    }
  }

  const wrapperRect = wrapper.getBoundingClientRect()
  const padding = getWrapperPadding(wrapper)
  const content = wrapper.querySelector('.easyink-content') as HTMLElement | null
  if (!content) {
    const offsetX = padding.x + fallback.marginOffsetX
    const offsetY = padding.y + fallback.marginOffsetY
    return {
      contentHeight: fallback.contentHeight,
      contentWidth: fallback.contentWidth,
      originClientX: wrapperRect.left + offsetX,
      originClientY: wrapperRect.top + offsetY,
      offsetX,
      offsetY,
    }
  }

  const contentRect = content.getBoundingClientRect()
  return {
    contentHeight: contentRect.height || fallback.contentHeight,
    contentWidth: contentRect.width || fallback.contentWidth,
    originClientX: contentRect.left,
    originClientY: contentRect.top,
    offsetX: contentRect.left - wrapperRect.left,
    offsetY: contentRect.top - wrapperRect.top,
  }
}
