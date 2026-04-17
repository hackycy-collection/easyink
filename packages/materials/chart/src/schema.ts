import type { MaterialNode } from '@easyink/schema'
import { convertUnit, generateId } from '@easyink/shared'

export const CHART_TYPE = 'chart'

export interface ChartProps {
  chartType: 'bar' | 'line' | 'pie' | 'radar' | 'scatter'
  data: unknown
  options: Record<string, unknown>
  backgroundColor: string
}

export const CHART_DEFAULTS: ChartProps = {
  chartType: 'bar',
  data: null,
  options: {},
  backgroundColor: '#ffffff',
}

export function createChartNode(partial?: Partial<MaterialNode>, unit?: string): MaterialNode {
  const c = unit && unit !== 'mm' ? (v: number) => convertUnit(v, 'mm', unit) : (v: number) => v
  return {
    id: generateId('chart'),
    type: CHART_TYPE,
    x: 0,
    y: 0,
    width: c(200),
    height: c(150),
    props: { ...CHART_DEFAULTS },
    ...partial,
  }
}

export const CHART_CAPABILITIES = {
  bindable: true,
  rotatable: false,
  resizable: true,
  supportsChildren: false,
  supportsAnimation: true,
  supportsUnionDrop: false,
  multiBinding: true,
}
