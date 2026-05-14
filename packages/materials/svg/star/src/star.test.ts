import { readTrustedViewerHtml } from '@easyink/core'
import { describe, expect, it } from 'vitest'
import { createSvgStarExtension } from './designer'
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
    expect(output).toContain('preserveAspectRatio="none"')
    expect(output).toContain('stroke-width="0.5mm"')
    expect(output).toContain('#ffcc00')
  })

  it('exposes deep-edit controls for star angle size and rotation', () => {
    const node = createSvgStarNode()
    const extension = createSvgStarExtension({} as never)
    const selectionType = extension.selectionTypes?.[0]
    const schema = selectionType?.getPropertySchema?.({
      type: 'svg-star.control',
      nodeId: node.id,
      payload: { handle: 'inner-radius' },
    }, node)

    expect(schema?.title).toBe('星星编辑')
    expect(schema?.schemas.map(item => item.key)).toEqual(['starInnerRatio', 'starRotation'])
    expect(schema?.read('starInnerRatio')).toBe(0.48)
  })

  it('creates default nodes sized for a square star viewBox', () => {
    const node = createSvgStarNode()

    expect(node.width).toBe(100)
    expect(node.height).toBe(100)
    expect((node.props as Record<string, unknown>).starPoints).toBe(5)
  })
})
