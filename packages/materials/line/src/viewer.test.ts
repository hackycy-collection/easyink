import { describe, expect, it } from 'vitest'
import { createLineNode, getLineThickness } from './schema'
import { renderLine } from './viewer'

const PX_PER_MM = 96 / 25.4

describe('renderLine', () => {
  it('uses element height as the line thickness in runtime output', () => {
    const node = createLineNode({
      height: 0.5,
      props: {
        lineColor: '#333333',
        lineType: 'solid',
      },
    })

    const output = renderLine(node, {
      data: {},
      resolvedProps: node.props,
      pageIndex: 0,
      unit: 'mm',
      zoom: 1,
    })

    expect(output.html).toContain('<svg')
    expect(output.html).toContain('display:block')
    expect(output.html).toContain(`viewBox="0 0 ${100 * PX_PER_MM} ${Math.max(1, 0.5 * PX_PER_MM)}"`)
    expect(output.html).toContain(`<rect x="0" y="0" width="${100 * PX_PER_MM}" height="${Math.max(1, 0.5 * PX_PER_MM)}" fill="#333333" />`)
  })

  it('keeps dashed and dotted line types in viewer output', () => {
    const dashed = createLineNode({
      height: 1,
      props: {
        lineColor: '#111111',
        lineType: 'dashed',
      },
    })
    const dotted = createLineNode({
      height: 1,
      props: {
        lineColor: '#222222',
        lineType: 'dotted',
      },
    })

    const dashedOutput = renderLine(dashed, {
      data: {},
      resolvedProps: dashed.props,
      pageIndex: 0,
      unit: 'px',
      zoom: 1,
    })
    const dottedOutput = renderLine(dotted, {
      data: {},
      resolvedProps: dotted.props,
      pageIndex: 0,
      unit: 'px',
      zoom: 1,
    })

    expect(dashedOutput.html).toContain('<rect x="0" y="0" width="12" height="1" fill="#111111" />')
    expect(dashedOutput.html).toContain('<rect x="20" y="0" width="12" height="1" fill="#111111" />')
    expect(dottedOutput.html).toContain('<rect x="0" y="0" width="2" height="1" fill="#222222" />')
    expect(dottedOutput.html).toContain('<rect x="8" y="0" width="2" height="1" fill="#222222" />')
  })

  it('falls back to legacy lineWidth when old templates still have zero height', () => {
    const legacyNode = createLineNode({
      height: 0,
      props: {
        lineWidth: 0.5,
        lineColor: '#444444',
        lineType: 'solid',
      },
    })

    expect(getLineThickness(legacyNode)).toBe(0.5)
  })
})
