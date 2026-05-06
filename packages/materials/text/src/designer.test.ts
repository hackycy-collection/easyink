import type { MaterialExtensionContext, NodeSignal } from '@easyink/core'
import type { MaterialNode } from '@easyink/schema'
import { createDefaultSchema } from '@easyink/schema'
import { describe, expect, it } from 'vitest'
import { createTextExtension } from './designer'
import { createTextNode } from './schema'

function createNodeSignal(node: MaterialNode): NodeSignal {
  return {
    get: () => node,
    subscribe: () => () => {},
  }
}

function createContext(): MaterialExtensionContext {
  const schema = createDefaultSchema()
  return {
    getSchema: () => schema,
    getNode: () => undefined,
    getSelection: () => ({ ids: [], count: 0, isEmpty: true }),
    getBindingLabel: binding => binding.fieldLabel || binding.fieldPath,
    commitCommand: () => {},
    tx: {
      run: () => {},
      batch: fn => fn(),
    },
    requestPropertyPanel: () => {},
    emit: () => {},
    on: () => () => {},
    getZoom: () => 1,
    getPageEl: () => null,
    t: key => key === 'designer.placeholder.textMaterialEmpty' ? '请输入内容或绑定数据' : key,
  }
}

describe('createTextExtension', () => {
  it('shows a localized placeholder in designer when text is empty and unbound', () => {
    const container = document.createElement('div')
    const extension = createTextExtension(createContext())

    extension.renderContent(createNodeSignal(createTextNode()), container)

    expect(container.innerHTML).toContain('请输入内容或绑定数据')
    expect(container.innerHTML).toContain('opacity:0.45')
  })

  it('prefers the binding label over the empty placeholder', () => {
    const container = document.createElement('div')
    const extension = createTextExtension(createContext())
    const node = createTextNode({
      binding: {
        sourceId: 'receipt',
        fieldPath: 'customer/name',
        fieldLabel: '客户姓名',
      },
    })

    extension.renderContent(createNodeSignal(node), container)

    expect(container.innerHTML).toContain('{#客户姓名}')
    expect(container.innerHTML).not.toContain('请输入内容或绑定数据')
  })
})
