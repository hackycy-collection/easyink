import type { MaterialNode } from '@easyink/schema'
import { convertUnit, generateId } from '@easyink/shared'

export const SVG_STAR_TYPE = 'svg-star'

export interface SvgStarProps {
  fillColor: string
  borderWidth: number
  borderColor: string
  starPoints: number
  starInnerRatio: number
  starRotation: number
}

export interface SvgStarControlSelection {
  handle: 'inner-radius' | 'rotation'
}

export const SVG_STAR_DEFAULTS: SvgStarProps = {
  fillColor: '#F59E0B',
  borderWidth: 0,
  borderColor: '#000000',
  starPoints: 5,
  starInnerRatio: 0.48,
  starRotation: -90,
}

export const SVG_STAR_CAPABILITIES = {
  bindable: false,
  rotatable: true,
  resizable: true,
  supportsChildren: false,
  supportsAnimation: true,
  supportsUnionDrop: false,
  multiBinding: false,
}

export function createSvgStarNode(partial?: Partial<MaterialNode>, unit?: string): MaterialNode {
  const c = unit && unit !== 'mm' ? (value: number) => convertUnit(value, 'mm', unit) : (value: number) => value
  const partialNode = partial ? { ...partial } : undefined
  const partialProps = (partial?.props ?? {}) as Partial<SvgStarProps>

  if (partialNode)
    delete partialNode.props

  return {
    id: generateId('svgs'),
    type: SVG_STAR_TYPE,
    x: 0,
    y: 0,
    width: c(100),
    height: c(100),
    props: {
      ...SVG_STAR_DEFAULTS,
      ...partialProps,
    },
    ...partialNode,
  }
}
