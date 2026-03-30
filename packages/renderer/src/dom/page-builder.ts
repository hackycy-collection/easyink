import type { PageSettings } from '@easyink/core'
import type { BackgroundPosition, ColorLayer, ImageLayer } from '@easyink/shared'
import { toPixels as coreToPixels, LayoutEngine } from '@easyink/core'

/**
 * BackgroundPosition → CSS background-position 映射
 */
const POSITION_MAP: Record<BackgroundPosition, string> = {
  'center': 'center',
  'top': 'top center',
  'bottom': 'bottom center',
  'left': 'center left',
  'right': 'center right',
  'top-left': 'left top',
  'top-right': 'right top',
  'bottom-left': 'left bottom',
  'bottom-right': 'right bottom',
}

/**
 * 页面构建结果
 */
export interface PageBuildResult {
  /** 页面外层容器（paper 尺寸） */
  page: HTMLElement
  /** 内容区域容器（margins 内缩） */
  contentArea: HTMLElement
}

/**
 * 构建页面 DOM 容器
 *
 * 创建外层 page 容器（对应纸张尺寸）和内层 contentArea 容器（对应去除边距后的区域）。
 *
 * @param pageSettings - 页面设置
 * @param dpi - DPI（默认 96）
 * @param zoom - 缩放倍率（默认 1）
 */
export function buildPage(
  pageSettings: PageSettings,
  dpi: number = 96,
  zoom: number = 1,
): PageBuildResult {
  const unit = pageSettings.unit
  const toPixels = (value: number): number => coreToPixels(value, unit, dpi, zoom)

  // 使用 LayoutEngine 解析纸张尺寸（page units）
  const layoutEngine = new LayoutEngine()
  const dims = layoutEngine.resolvePageDimensions(pageSettings)

  const margins = pageSettings.margins

  // ── 外层 page 容器 ──
  const page = document.createElement('div')
  page.className = 'easyink-page'
  page.dataset.easyinkUnit = unit
  const ps = page.style
  ps.position = 'relative'
  ps.width = `${toPixels(dims.width)}px`
  ps.height = `${toPixels(dims.height)}px`
  ps.boxSizing = 'border-box'
  ps.overflow = pageSettings.overflow === 'auto-extend' ? 'visible' : 'hidden'

  // 背景（多层复合）
  applyBackground(page, pageSettings)

  // ── 内层 contentArea 容器 ──
  const contentArea = document.createElement('div')
  contentArea.className = 'easyink-content'
  const cs = contentArea.style
  cs.position = 'relative'
  cs.left = `${toPixels(margins.left)}px`
  cs.top = `${toPixels(margins.top)}px`
  cs.width = `${toPixels(dims.width - margins.left - margins.right)}px`
  cs.height = `${toPixels(dims.height - margins.top - margins.bottom)}px`

  page.appendChild(contentArea)

  return { page, contentArea }
}

/**
 * 将多层背景应用到页面元素
 *
 * CSS 多背景：第一个 = 最上层，layers 数组索引 0 = 最底层，
 * 因此需要反转顺序组装 CSS。
 *
 * 颜色层使用 linear-gradient(color, color) 以支持 CSS 多背景语法。
 * 图片层使用 url(...)。
 * opacity < 1 的层需通过额外的绝对定位元素叠加。
 */
function applyBackground(page: HTMLElement, pageSettings: PageSettings): void {
  const bg = pageSettings.background
  if (!bg || bg.layers.length === 0)
    return

  const enabledLayers = bg.layers.filter(l => l.enabled !== false)
  if (enabledLayers.length === 0)
    return

  // 分离：需要 opacity 叠加层（opacity < 1 的图片层）vs 可用 CSS 多背景的层
  const cssLayers: Array<{ image: string, size: string, repeat: string, position: string }> = []
  let bottomColor: string | null = null

  for (let i = 0; i < enabledLayers.length; i++) {
    const layer = enabledLayers[i]

    if (layer.type === 'color') {
      const cl = layer as ColorLayer
      const color = applyColorOpacity(cl.color, cl.opacity)
      // 如果是最底层颜色层，用 backgroundColor（更高效）
      if (i === 0 && bottomColor === null) {
        bottomColor = color
      }
      else {
        cssLayers.push({
          image: `linear-gradient(${color},${color})`,
          size: 'auto',
          repeat: 'no-repeat',
          position: 'center',
        })
      }
    }
    else if (layer.type === 'image') {
      const il = layer as ImageLayer
      if (il.opacity !== undefined && il.opacity < 1) {
        // 图片 opacity 需要单独叠加元素
        appendImageOverlay(page, il)
      }
      else {
        cssLayers.push({
          image: `url(${il.url})`,
          size: il.size ?? 'auto',
          repeat: il.repeat ?? 'repeat',
          position: POSITION_MAP[il.position ?? 'center'],
        })
      }
    }
  }

  const ps = page.style

  if (bottomColor)
    ps.backgroundColor = bottomColor

  if (cssLayers.length > 0) {
    // CSS 多背景：第一个在最上层 → 反转数组
    const reversed = cssLayers.slice().reverse()
    ps.backgroundImage = reversed.map(l => l.image).join(',')
    ps.backgroundSize = reversed.map(l => l.size).join(',')
    ps.backgroundRepeat = reversed.map(l => l.repeat).join(',')
    ps.backgroundPosition = reversed.map(l => l.position).join(',')
  }
}

/**
 * 为带 opacity 的图片层创建绝对定位叠加元素
 */
function appendImageOverlay(page: HTMLElement, layer: ImageLayer): void {
  const overlay = document.createElement('div')
  const os = overlay.style
  os.position = 'absolute'
  os.inset = '0'
  os.opacity = String(layer.opacity ?? 1)
  os.backgroundImage = `url(${layer.url})`
  os.backgroundSize = layer.size ?? 'auto'
  os.backgroundRepeat = layer.repeat ?? 'repeat'
  os.backgroundPosition = POSITION_MAP[layer.position ?? 'center']
  os.pointerEvents = 'none'
  page.appendChild(overlay)
}

/**
 * 为颜色值应用 opacity
 *
 * 简易处理：如果 opacity < 1 且为 hex 颜色，转为 rgba。
 * 否则直接返回原始颜色。
 */
function applyColorOpacity(color: string, opacity?: number): string {
  if (opacity === undefined || opacity >= 1)
    return color

  // 解析 #RGB / #RRGGBB
  const hex = color.trim()
  if (hex.startsWith('#')) {
    let r: number, g: number, b: number
    if (hex.length === 4) {
      r = Number.parseInt(hex[1] + hex[1], 16)
      g = Number.parseInt(hex[2] + hex[2], 16)
      b = Number.parseInt(hex[3] + hex[3], 16)
    }
    else if (hex.length === 7) {
      r = Number.parseInt(hex.slice(1, 3), 16)
      g = Number.parseInt(hex.slice(3, 5), 16)
      b = Number.parseInt(hex.slice(5, 7), 16)
    }
    else {
      return color
    }
    return `rgba(${r},${g},${b},${opacity})`
  }

  return color
}
