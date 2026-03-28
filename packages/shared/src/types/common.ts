/**
 * 四边间距
 */
export interface Spacing {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * 背景样式
 */
export interface BackgroundStyle {
  color?: string
  image?: string
  size?: 'cover' | 'contain' | 'auto'
  repeat?: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y'
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
