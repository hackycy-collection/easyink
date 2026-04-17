import type { MaterialNode } from '@easyink/schema'
import { convertUnit, generateId } from '@easyink/shared'

export const SVG_TYPE = 'svg'

export interface SvgProps {
  content: string
  viewBox: string
  preserveAspectRatio: string
  fillColor: string
}

export const SVG_DEFAULTS: SvgProps = {
  content: '',
  viewBox: '0 0 100 100',
  preserveAspectRatio: 'xMidYMid meet',
  fillColor: '#000000',
}

export function createSvgNode(partial?: Partial<MaterialNode>, unit?: string): MaterialNode {
  const c = unit && unit !== 'mm' ? (v: number) => convertUnit(v, 'mm', unit) : (v: number) => v
  return {
    id: generateId('svg'),
    type: SVG_TYPE,
    x: 0,
    y: 0,
    width: c(100),
    height: c(100),
    props: { ...SVG_DEFAULTS },
    ...partial,
  }
}

export const SVG_CAPABILITIES = {
  bindable: false,
  rotatable: true,
  resizable: true,
  supportsChildren: false,
  supportsAnimation: true,
  supportsUnionDrop: false,
  multiBinding: false,
}
