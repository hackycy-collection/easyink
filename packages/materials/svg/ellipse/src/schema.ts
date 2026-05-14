import type { MaterialNode } from '@easyink/schema'
import { convertUnit, generateId } from '@easyink/shared'

export const SVG_ELLIPSE_TYPE = 'svg-ellipse'

export interface SvgEllipseProps {
  fillColor: string
  borderWidth: number
  borderColor: string
  ellipseInset: number
}

export const SVG_ELLIPSE_DEFAULTS: SvgEllipseProps = {
  fillColor: '#000000',
  borderWidth: 0,
  borderColor: '#000000',
  ellipseInset: 0,
}

export const SVG_ELLIPSE_CAPABILITIES = {
  bindable: false,
  rotatable: true,
  resizable: true,
  supportsChildren: false,
  supportsAnimation: true,
  supportsUnionDrop: false,
  multiBinding: false,
}

export function createSvgEllipseNode(partial?: Partial<MaterialNode>, unit?: string): MaterialNode {
  const c = unit && unit !== 'mm' ? (value: number) => convertUnit(value, 'mm', unit) : (value: number) => value
  const partialNode = partial ? { ...partial } : undefined
  const partialProps = (partial?.props ?? {}) as Partial<SvgEllipseProps>

  if (partialNode)
    delete partialNode.props

  return {
    id: generateId('svge'),
    type: SVG_ELLIPSE_TYPE,
    x: 0,
    y: 0,
    width: c(120),
    height: c(80),
    props: {
      ...SVG_ELLIPSE_DEFAULTS,
      ...partialProps,
    },
    ...partialNode,
  }
}
