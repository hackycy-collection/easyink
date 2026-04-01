import type { MaterialNode, MaterialTypeDefinition, TemplateSchema } from '@easyink/core'
import type { DesignerContext, DesignerOptions } from '../types'
import { SCHEMA_VERSION } from '@easyink/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, provide, render } from 'vue'
import { DataBindingLayer } from '../components/DataBindingLayer'
import { DataSourcePanel } from '../components/DataSourcePanel'
import { DesignCanvas } from '../components/DesignCanvas'
import { useDesigner } from '../composables/use-designer'
import { readBindingDragData } from '../interaction'
import { DESIGNER_INJECTION_KEY } from '../types'

interface MockDataTransfer {
  effectAllowed: string
  getData: (type: string) => string
  setData: (type: string, value: string) => void
}

function createSchema(materials: MaterialNode[]): TemplateSchema {
  return {
    materials,
    meta: { name: 'phase-9-test' },
    page: {
      margins: { bottom: 10, left: 10, right: 10, top: 10 },
      orientation: 'portrait',
      paper: 'A4',
      unit: 'mm',
    },
    version: SCHEMA_VERSION,
  }
}

function createMockDataTransfer(initial?: Record<string, string>): MockDataTransfer {
  const store = new Map(Object.entries(initial ?? {}))

  return {
    effectAllowed: 'all',
    getData(type: string) {
      return store.get(type) ?? ''
    },
    setData(type: string, value: string) {
      store.set(type, value)
    },
  }
}

function dispatchBindingDrop(target: HTMLElement, path: string): void {
  const payload = { path }
  const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent
  Object.defineProperty(event, 'dataTransfer', {
    value: createMockDataTransfer({
      'application/easyink-binding': JSON.stringify(payload),
      'text/plain': path,
    }),
  })
  target.dispatchEvent(event)
}

function mountHarness(
  options: DesignerOptions,
  renderChildren: () => Array<ReturnType<typeof h>>,
) {
  const container = document.createElement('div')
  document.body.appendChild(container)

  let designer!: ReturnType<typeof useDesigner>

  const Host = defineComponent({
    setup() {
      designer = useDesigner(options)

      const context: DesignerContext = {
        addMaterial: designer.addMaterial,
        batchOperations: designer.batchOperations,
        canRedo: designer.canRedo,
        canUndo: designer.canUndo,
        canvas: designer.canvas,
        contextMenu: designer.contextMenu,
        engine: designer.engine,
        guides: designer.guides,
        interaction: designer.interaction,
        locale: designer.locale,
        marquee: designer.marquee,
        materialTypes: designer.materialTypes,
        redo: designer.redo,
        removeSelected: designer.removeSelected,
        renderer: designer.renderer,
        schema: designer.schema,
        selection: designer.selection,
        snapping: designer.snapping,
        strategyManager: designer.strategyManager,
        undo: designer.undo,
      }

      provide(DESIGNER_INJECTION_KEY, context)

      return () => h('div', { class: 'phase-9-test-host' }, renderChildren())
    },
  })

  render(h(Host), container)

  return {
    container,
    designer,
    unmount() {
      render(null, container)
      container.remove()
    },
  }
}

async function flushDesigner(): Promise<void> {
  await nextTick()
  await nextTick()
  await nextTick()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('phase 9 binding drag and drop', () => {
  it('serializes fullPath and key from DataSourcePanel drag payload', async () => {
    const harness = mountHarness({
      dataSources: [
        {
          displayName: '订单数据',
          fields: [
            { key: 'customerName', title: '客户名称' },
            { fullPath: 'orderItems.itemName', key: 'itemName', title: '商品名称' },
          ],
          name: 'orders',
        },
      ],
      schema: createSchema([]),
    }, () => [h(DataSourcePanel)])

    const header = harness.container.querySelector('.easyink-datasource-group__header') as HTMLElement
    header.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushDesigner()

    const leaves = harness.container.querySelectorAll('.easyink-datasource-leaf')
    const itemLeaf = leaves[1] as HTMLElement
    const dragEvent = new Event('dragstart', { bubbles: true }) as DragEvent
    const dataTransfer = createMockDataTransfer()
    Object.defineProperty(dragEvent, 'dataTransfer', { value: dataTransfer })

    itemLeaf.dispatchEvent(dragEvent)

    const payload = readBindingDragData(dataTransfer)
    expect(payload).toEqual({
      fullPath: 'orderItems.itemName',
      key: 'itemName',
      path: 'orderItems.itemName',
      sourceDisplayName: '订单数据',
      sourceName: 'orders',
      title: '商品名称',
    })
    expect(dataTransfer.getData('text/plain')).toBe('orderItems.itemName')

    harness.unmount()
  })

  it('binds text material and restores static content after removing binding', async () => {
    const harness = mountHarness({
      schema: createSchema([
        {
          id: 'text-1',
          layout: { height: 30, position: 'absolute', width: 120, x: 10, y: 10 },
          props: { content: 'Fallback text' },
          style: {},
          type: 'text',
        },
      ]),
    }, () => [h(DesignCanvas), h(DataBindingLayer)])

    await flushDesigner()

    const textMaterial = harness.container.querySelector('[data-material-id="text-1"]') as HTMLElement
    dispatchBindingDrop(textMaterial, 'customer.name')
    await flushDesigner()

    const boundText = harness.designer.engine.schema.getMaterialById('text-1')
    expect(boundText?.binding).toEqual({ path: 'customer.name' })
    expect(boundText?.props.content).toBe('Fallback text')

    const bindingLabel = harness.container.querySelector('.easyink-binding-label__path') as HTMLElement
    expect(bindingLabel.textContent).toBe('{{customer.name}}')

    const removeButton = harness.container.querySelector('.easyink-binding-label__remove') as HTMLButtonElement
    removeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushDesigner()

    const restoredText = harness.designer.engine.schema.getMaterialById('text-1')
    expect(restoredText?.binding).toBeUndefined()

    const rerenderedText = harness.container.querySelector('[data-material-id="text-1"]') as HTMLElement
    expect(rerenderedText.textContent).toBe('Fallback text')

    harness.unmount()
  })

  it('delegates binding drop to material strategy when custom drop handling exists', async () => {
    const strategyDrop = vi.fn().mockReturnValue(true)
    const definition: MaterialTypeDefinition = {
      category: 'table',
      defaultLayout: { height: 'auto', position: 'flow', width: 'auto' },
      defaultProps: {
        bordered: true,
        columns: [
          { key: 'name', title: 'Name', width: 50 },
          { key: 'age', title: 'Age', width: 50 },
        ],
      },
      defaultStyle: {},
      icon: 'data-table',
      name: '数据表格',
      propSchemas: [],
      type: 'data-table',
    }

    const harness = mountHarness({
      materials: [{ definition, interaction: { onDrop: strategyDrop } }],
      schema: createSchema([
        {
          id: 'dt-1',
          layout: { height: 'auto', position: 'flow', width: 200 },
          props: {
            bordered: true,
            columns: [
              { key: 'name', title: 'Name', width: 50 },
              { key: 'age', title: 'Age', width: 50 },
            ],
            showHeader: true,
          },
          style: {},
          type: 'data-table',
        },
      ]),
    }, () => [h(DesignCanvas)])

    await flushDesigner()

    const targetCell = harness.container.querySelector('[data-material-id="dt-1"] tbody td:last-child') as HTMLElement
    dispatchBindingDrop(targetCell, 'users.age')
    await flushDesigner()

    expect(strategyDrop).toHaveBeenCalledTimes(1)
    expect(strategyDrop.mock.calls[0]?.[1]?.id).toBe('dt-1')
    expect(readBindingDragData(strategyDrop.mock.calls[0]?.[0]?.dataTransfer)).toEqual({ path: 'users.age' })

    harness.unmount()
  })
})
