import { readTrustedViewerHtml } from '@easyink/core'
import { describe, expect, it } from 'vitest'
import { svgHeartDesignerPropSchemas } from './prop-schemas'
import { createSvgHeartNode } from './schema'
import { renderSvgHeart } from './viewer'

describe('renderSvgHeart', () => {
  it('renders a filled border layer and a separate content layer', () => {
    const node = createSvgHeartNode({
      width: 80,
      height: 72,
      props: {
        fillColor: '#ff7a90',
        borderWidth: 6,
        borderColor: '#7a1020',
        heartCleftDepth: 20,
        heartShoulderWidth: 22,
      },
    })

    const html = readTrustedViewerHtml(renderSvgHeart(node).html!)

    expect(html).toContain('viewBox="0 0 100 100"')
    expect(html.match(/<path /g)).toHaveLength(2)
    expect(html).toContain('fill="#7a1020"')
    expect(html).toContain('fill="#ff7a90"')

    const [outerPath, innerPath] = Array.from(html.matchAll(/d="([^"]+)"/g), match => match[1])
    const outerBounds = getPathBounds(outerPath)
    const innerBounds = getPathBounds(innerPath)

    expect(outerBounds).toEqual({ minX: 0, minY: 0, maxX: 100, maxY: 100 })
    expect(innerBounds.minX).toBeGreaterThan(outerBounds.minX)
    expect(innerBounds.minY).toBeGreaterThan(outerBounds.minY)
    expect(innerBounds.maxX).toBeLessThan(outerBounds.maxX)
    expect(innerBounds.maxY).toBeLessThan(outerBounds.maxY)
  })

  it('renders a single content layer when border width is zero', () => {
    const html = readTrustedViewerHtml(renderSvgHeart(createSvgHeartNode()).html!)

    expect(html.match(/<path /g)).toHaveLength(1)
    expect(html).toContain('fill="#E5484D"')
  })

  it('cuts out the heart interior when only the border is configured', () => {
    const node = createSvgHeartNode({
      width: 100,
      height: 90,
      props: {
        fillColor: 'transparent',
        borderWidth: 6,
        borderColor: '#7a1020',
      },
    })

    const html = readTrustedViewerHtml(renderSvgHeart(node).html!)

    expect(html.match(/<path /g)).toHaveLength(1)
    expect(html).toContain('fill-rule="evenodd"')
    expect(html).toContain('fill="#7a1020"')
    expect(html).not.toContain('fill="transparent"')
  })

  it('uses border/content wording in the designer schema', () => {
    expect(svgHeartDesignerPropSchemas.map(item => item.label)).toEqual([
      '内容填充色',
      '边框宽度',
      '边框填充色',
      '凹口深度',
      '肩宽',
    ])
  })
})

function getPathBounds(path: string): { minX: number, minY: number, maxX: number, maxY: number } {
  const values = Array.from(path.matchAll(/-?\d+(?:\.\d+)?/g), match => Number(match[0]))
  const points = [] as Array<{ x: number, y: number }>

  for (let index = 0; index < values.length - 1; index += 2)
    points.push({ x: values[index], y: values[index + 1] })

  return {
    minX: Math.min(...points.map(point => point.x)),
    minY: Math.min(...points.map(point => point.y)),
    maxX: Math.max(...points.map(point => point.x)),
    maxY: Math.max(...points.map(point => point.y)),
  }
}
