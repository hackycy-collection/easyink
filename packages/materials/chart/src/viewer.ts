import type { MaterialNode } from '@easyink/schema'
import type { ChartProps } from './schema'
import { trustedViewerHtml } from '@easyink/core'
import { getNodeProps } from '@easyink/schema'

export function renderChart(node: MaterialNode) {
  const props = getNodeProps<ChartProps>(node)

  return {
    html: trustedViewerHtml(`<div style="
      width: 100%;
      height: 100%;
      background: ${props.backgroundColor || 'transparent'};
      display: flex;
      align-items: center;
      justify-content: center;
    ">[Chart: ${props.chartType}]</div>`),
  }
}
