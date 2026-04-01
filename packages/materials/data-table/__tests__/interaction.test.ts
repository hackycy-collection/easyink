import type { MaterialNode } from '@easyink/core'
import type { CanvasEvent } from '@easyink/designer'
import { describe, expect, it, vi } from 'vitest'
import { dataTableInteractionStrategy } from '../src/interaction'

function createDataTableNode(overrides: Partial<MaterialNode> = {}): MaterialNode {
  return {
    id: 'dt-1',
    type: 'data-table',
    props: {
      columns: [
        { key: 'col1', title: 'Name', width: 50, binding: { path: 'users.name' } },
        { key: 'col2', title: 'Age', width: 50, binding: { path: 'users.age' } },
      ],
      bordered: true,
      striped: false,
      showHeader: true,
    },
    layout: { position: 'flow', width: 'auto', height: 'auto' },
    style: {},
    ...overrides,
  } as MaterialNode
}

function createCanvasEvent(material: MaterialNode, overrides: Partial<CanvasEvent> = {}): CanvasEvent {
  return {
    originalEvent: new MouseEvent('dblclick'),
    pageX: 100,
    pageY: 50,
    material,
    ...overrides,
  }
}

function createMouseEventWithTarget(): MouseEvent {
  const target = document.createElement('div')
  const event = new MouseEvent('mousedown', { bubbles: true })
  Object.defineProperty(event, 'target', { value: target })
  return event
}

function createDropEvent(target: HTMLElement, path?: string): DragEvent {
  const event = new Event('drop') as DragEvent
  Object.defineProperty(event, 'target', { value: target })
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      getData(type: string) {
        if (!path) {
          return ''
        }

        if (type === 'application/easyink-binding') {
          return JSON.stringify({ path })
        }

        if (type === 'text/plain') {
          return path
        }

        return ''
      },
    },
  })
  return event
}

function createDropContext() {
  const updateMaterialProps = vi.fn()
  const executeCommand = vi.fn((command: { execute: () => void }) => command.execute())

  return {
    context: {
      executeCommand,
      getEngine: () => ({ operations: { updateMaterialProps } }) as any,
      getSelectedMaterial: () => undefined,
    },
    executeCommand,
    updateMaterialProps,
  }
}

describe('dataTableInteractionStrategy', () => {
  describe('onDoubleClick', () => {
    it('should return true when in selected state', () => {
      const material = createDataTableNode()
      const event = createCanvasEvent(material)
      const result = dataTableInteractionStrategy.onDoubleClick!(event, 'selected')
      expect(result).toBe(true)
    })

    it('should return false when not in selected state', () => {
      const material = createDataTableNode()
      const event = createCanvasEvent(material)
      const result = dataTableInteractionStrategy.onDoubleClick!(event, 'editing')
      expect(result).toBe(false)
    })
  })

  describe('onMouseDown', () => {
    it('should return false when not clicking a column handle', () => {
      const material = createDataTableNode()
      const event = createCanvasEvent(material, {
        originalEvent: createMouseEventWithTarget(),
      })
      const result = dataTableInteractionStrategy.onMouseDown!(event, 'selected')
      expect(result).toBe(false)
    })

    it('should return false when not in selected state', () => {
      const material = createDataTableNode()
      const event = createCanvasEvent(material, {
        originalEvent: createMouseEventWithTarget(),
      })
      const result = dataTableInteractionStrategy.onMouseDown!(event, 'editing')
      expect(result).toBe(false)
    })
  })

  describe('strategy shape', () => {
    it('should have onDoubleClick handler', () => {
      expect(dataTableInteractionStrategy.onDoubleClick).toBeTypeOf('function')
    })

    it('should have onMouseDown handler', () => {
      expect(dataTableInteractionStrategy.onMouseDown).toBeTypeOf('function')
    })

    it('should have onEnterEditing handler', () => {
      expect(dataTableInteractionStrategy.onEnterEditing).toBeTypeOf('function')
    })

    it('should have onExitEditing handler', () => {
      expect(dataTableInteractionStrategy.onExitEditing).toBeTypeOf('function')
    })

    it('should have renderOverlay handler', () => {
      expect(dataTableInteractionStrategy.renderOverlay).toBeTypeOf('function')
    })

    it('should have onDrop handler', () => {
      expect(dataTableInteractionStrategy.onDrop).toBeTypeOf('function')
    })
  })

  describe('renderOverlay', () => {
    it('should return null when not in selected state', () => {
      const material = createDataTableNode()
      const result = dataTableInteractionStrategy.renderOverlay!('editing', material)
      expect(result).toBeNull()
    })

    it('should return null when only one column', () => {
      const material = createDataTableNode({
        props: {
          columns: [{ key: 'col1', title: 'Name', width: 100 }],
          bordered: true,
        },
      })
      const result = dataTableInteractionStrategy.renderOverlay!('selected', material)
      expect(result).toBeNull()
    })

    it('should return VNode with column handles when multiple columns', () => {
      const material = createDataTableNode()
      const result = dataTableInteractionStrategy.renderOverlay!('selected', material)
      expect(result).not.toBeNull()
    })
  })

  describe('onDrop', () => {
    it('should return false when no transfer data', () => {
      const material = createDataTableNode()
      const dragEvent = new Event('drop') as DragEvent
      Object.defineProperty(dragEvent, 'dataTransfer', {
        value: { getData: () => '' },
      })
      const result = dataTableInteractionStrategy.onDrop!(
        dragEvent,
        material,
        {} as any,
      )
      expect(result).toBe(false)
    })

    it('should bind the target column when payload is valid', () => {
      const material = createDataTableNode({
        props: {
          columns: [
            { key: 'col1', title: 'Name', width: 50, binding: { path: 'users.name' } },
            { key: 'col2', title: 'Age', width: 50 },
          ],
          showHeader: true,
        },
      })
      const row = document.createElement('tr')
      const firstCell = document.createElement('td')
      const secondCell = document.createElement('td')
      row.append(firstCell, secondCell)
      const { context, executeCommand, updateMaterialProps } = createDropContext()

      const result = dataTableInteractionStrategy.onDrop!(
        createDropEvent(secondCell, 'users.age'),
        material,
        context as any,
      )

      expect(result).toBe(true)
      expect(executeCommand).toHaveBeenCalledTimes(1)
      expect(updateMaterialProps).toHaveBeenCalledWith('dt-1', {
        columns: [
          { key: 'col1', title: 'Name', width: 50, binding: { path: 'users.name' } },
          { key: 'col2', title: 'Age', width: 50, binding: { path: 'users.age' } },
        ],
      })
    })

    it('should reject bindings that break the shared data source prefix', () => {
      const material = createDataTableNode({
        props: {
          columns: [
            { key: 'col1', title: 'Name', width: 50, binding: { path: 'users.name' } },
            { key: 'col2', title: 'Amount', width: 50 },
          ],
          showHeader: true,
        },
      })
      const row = document.createElement('tr')
      const firstCell = document.createElement('td')
      const secondCell = document.createElement('td')
      row.append(firstCell, secondCell)
      const { context, executeCommand, updateMaterialProps } = createDropContext()

      const result = dataTableInteractionStrategy.onDrop!(
        createDropEvent(secondCell, 'orders.amount'),
        material,
        context as any,
      )

      expect(result).toBe(false)
      expect(executeCommand).not.toHaveBeenCalled()
      expect(updateMaterialProps).not.toHaveBeenCalled()
    })
  })

  describe('onEnterEditing', () => {
    it('should handle missing DOM element gracefully', () => {
      const material = createDataTableNode()
      expect(() => {
        dataTableInteractionStrategy.onEnterEditing!(material, {} as any)
      }).not.toThrow()
    })
  })

  describe('onExitEditing', () => {
    it('should handle missing DOM element gracefully', () => {
      const material = createDataTableNode()
      expect(() => {
        dataTableInteractionStrategy.onExitEditing!(material, {} as any)
      }).not.toThrow()
    })
  })
})
