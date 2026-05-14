import { readTrustedViewerHtml } from '@easyink/core'
import { describe, expect, it } from 'vitest'
import { createSvgStarNode } from './schema'
import { renderSvgStar } from './viewer'

describe('renderSvgStar', () => {
  it('renders polygon content with configurable star props', () => {
    const node = createSvgStarNode({
      props: {
        fillColor: '#ffcc00',
        borderWidth: 0.5,
        borderColor: '#111111',
        starPoints: 6,
        starInnerRatio: 0.4,
        starRotation: -90,
      },
    })

    const output = readTrustedViewerHtml(renderSvgStar(node).html!)

    expect(output).toContain('<polygon')
    expect(output).toContain('stroke-width="0.5mm"')
    expect(output).toContain('#ffcc00')
  })

  it('creates default nodes sized for a square star viewBox', () => {
    const node = createSvgStarNode()

    expect(node.width).toBe(100)
    expect(node.height).toBe(100)
    expect((node.props as Record<string, unknown>).starPoints).toBe(5)
  })
})
