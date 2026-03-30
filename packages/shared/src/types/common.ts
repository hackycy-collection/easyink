/**
 * 四边间距
 */
export interface Spacing {
  top: number
  right: number
  bottom: number
  left: number
}

// ─── 纸张背景（多层复合模型） ───

/**
 * 背景定位 — 9 宫格预设值
 */
export type BackgroundPosition
  = 'center'
    | 'top' | 'bottom' | 'left' | 'right'
    | 'top-left' | 'top-right'
    | 'bottom-left' | 'bottom-right'

/**
 * 背景层基础属性
 */
export interface BackgroundLayerBase {
  /** 不透明度 0-1，默认 1 */
  opacity?: number
  /** 是否启用，默认 true；禁用时不渲染但保留在 Schema 中 */
  enabled?: boolean
}

/**
 * 纯色背景层
 */
export interface ColorLayer extends BackgroundLayerBase {
  type: 'color'
  /** CSS 颜色值（hex/rgb/rgba/hsl 等） */
  color: string
}

/**
 * 图片背景层
 */
export interface ImageLayer extends BackgroundLayerBase {
  type: 'image'
  /** 图片 URL 或 base64 data URI */
  url: string
  size?: 'cover' | 'contain' | 'auto'
  repeat?: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y'
  position?: BackgroundPosition
}

/**
 * 背景层 — 判别联合类型，v2 可扩展 gradient / pattern
 */
export type BackgroundLayer = ColorLayer | ImageLayer

/**
 * 纸张背景 — 多层复合
 *
 * layers 数组：索引 0 = 最底层，末尾 = 最上层
 */
export interface PageBackground {
  layers: BackgroundLayer[]
}

/**
 * 边框样式
 */
export interface BorderStyle {
  width: number
  style: 'solid' | 'dashed' | 'dotted' | 'none'
  color: string
  radius?: number | [number, number, number, number]
}
