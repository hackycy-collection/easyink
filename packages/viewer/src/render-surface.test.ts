import type { PagePlanEntry } from '@easyink/core'
import type { MaterialNode, PageSchema } from '@easyink/schema'
import { trustedViewerHtml } from '@easyink/core'
import { describe, expect, it } from 'vitest'
import { MaterialRendererRegistry } from './material-registry'
import { renderPages } from './render-surface'

describe('renderPages', () => {
  it('uses the registered render-size callback for wrapper dimensions', () => {
    const container = document.createElement('div')
    const registry = new MaterialRendererRegistry()
    const node: MaterialNode = {
      id: 'custom-1',
      type: 'custom',
      x: 5,
      y: 10,
      width: 30,
      height: 20,
      props: {},
    }
    const pages: PagePlanEntry[] = [{
      index: 0,
      width: 80,
      height: 60,
      elements: [node],
      yOffset: 0,
    }]
    const pageSchema: PageSchema = {
      mode: 'fixed',
      width: 80,
      height: 60,
    }

    registry.register('custom', {
      render: () => ({ html: trustedViewerHtml('<div>custom</div>') }),
      getRenderSize: () => ({ height: 7 }),
    })

    renderPages(pages, registry, {
      container,
      document,
      zoom: 1,
      unit: 'mm',
      data: {},
      resolvedPropsMap: new Map(),
      pageSchema,
    }, [])

    const element = container.querySelector('[data-element-id="custom-1"]') as HTMLElement | null
    expect(element).not.toBeNull()
    expect(element!.style.width).toBe('30mm')
    expect(element!.style.height).toBe('7mm')
  })
})
