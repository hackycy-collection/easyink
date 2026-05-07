import { describe, expect, it } from 'vitest'
import { createTextNode } from './schema'
import { renderText } from './viewer'

describe('renderText', () => {
  it('renders vertical writing mode with native vertical styles', () => {
    const node = createTextNode({
      props: {
        writingMode: 'vertical',
        overflow: 'ellipsis',
        textAlign: 'right',
        verticalAlign: 'top',
      },
    })

    const { html } = renderText(node)

    expect(html).toContain('writing-mode:vertical-rl')
    expect(html).toContain('text-orientation:mixed')
    expect(html).toContain('text-align:end')
    expect(html).toContain('justify-content:flex-end')
    expect(html).not.toContain('text-overflow:ellipsis')
  })

  it('treats legacy rich text content as escaped plain text', () => {
    const node = createTextNode({
      props: {
        content: '<b>unsafe</b>',
        richText: true,
      },
    })

    const { html } = renderText(node)

    expect(html).toContain('&lt;b&gt;unsafe&lt;/b&gt;')
    expect(html).not.toContain('<b>unsafe</b>')
  })
})
