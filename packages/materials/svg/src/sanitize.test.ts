import type { MaterialNode } from '@easyink/schema'
import { describe, expect, it } from 'vitest'
import { sanitizeSvgContent } from './sanitize'
import { renderSvg } from './viewer'

describe('sanitizeSvgContent', () => {
  it('removes script elements and event handler attributes', () => {
    const output = sanitizeSvgContent('<g onload="alert(1)"><path d="M0 0L10 10" onclick="alert(2)" /></g><script>alert(3)</script>')

    expect(output).toContain('<g')
    expect(output).toContain('<path')
    expect(output).toContain('d="M0 0L10 10"')
    expect(output).not.toContain('onload')
    expect(output).not.toContain('onclick')
    expect(output).not.toContain('<script')
  })

  it('allows http and https image hrefs but rejects scriptable hrefs', () => {
    const output = sanitizeSvgContent('<image href="https://example.com/a.png" width="10" height="10" /><image href="javascript:alert(1)" width="10" height="10" />')

    expect(output).toContain('https://example.com/a.png')
    expect(output).not.toContain('javascript:')
  })

  it('keeps internal paint references and drops external url references', () => {
    const output = sanitizeSvgContent('<rect fill="url(#grad)" stroke="url(https://example.com/x)" width="10" height="10" />')

    expect(output).toContain('fill="url(#grad)"')
    expect(output).not.toContain('stroke=')
  })
})

describe('renderSvg', () => {
  it('sanitizes content and escapes wrapper attributes', () => {
    const node = {
      id: 'svg_1',
      type: 'svg',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      props: {
        content: '<circle r="5" onmouseover="alert(1)" /><script>alert(2)</script>',
        viewBox: '0 0 10 10" onload="alert(3)',
        preserveAspectRatio: 'xMidYMid meet',
        fillColor: 'red" onclick="alert(4)',
      },
    } satisfies MaterialNode

    const output = renderSvg(node).html

    expect(output).toContain('<circle')
    expect(output).not.toContain('onmouseover')
    expect(output).not.toContain('<script')
    expect(output).not.toContain('onload="alert')
    expect(output).not.toContain('onclick="alert')
    expect(output).toContain('&quot;')
  })
})
