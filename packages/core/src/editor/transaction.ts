import type { DocumentSchema } from '@easyink/schema'
import type { Mapping, Selection, Step, Transaction } from './types'
import { createMapping } from './mapping'
import { emptySelection } from './selection'

interface TransactionInternal {
  steps: readonly Step[]
  docBefore: DocumentSchema
  doc: DocumentSchema
  selection: Selection
  selectionSet: boolean
  mapping: Mapping
  meta: ReadonlyMap<string, unknown>
}

export function createTransaction(
  docBefore: DocumentSchema,
  selection: Selection,
): Transaction {
  return fromInternal({
    steps: [],
    docBefore,
    doc: docBefore,
    selection,
    selectionSet: false,
    mapping: createMapping([]),
    meta: new Map(),
  })
}

function fromInternal(internal: TransactionInternal): Transaction {
  return {
    get steps() { return internal.steps },
    get docBefore() { return internal.docBefore },
    get doc() { return internal.doc },
    get selection() { return internal.selection },
    get selectionSet() { return internal.selectionSet },
    get mapping() { return internal.mapping },
    get meta() { return internal.meta },

    step(step: Step): Transaction {
      const result = step.apply(internal.doc)
      if (result.failed || !result.doc)
        throw new Error(result.failed || '[editor] step apply returned no doc')
      const map = step.getMap()
      const nextMapping = internal.mapping.append(map)
      // selection 自动跟随 step map；映射返回 null 表示选区目标被删除，降级为 empty
      const mappedSel = map.mapSelection(internal.selection)
      const nextSelection = mappedSel ?? emptySelection()
      return fromInternal({
        steps: [...internal.steps, step],
        docBefore: internal.docBefore,
        doc: result.doc,
        selection: nextSelection,
        selectionSet: internal.selectionSet || mappedSel == null,
        mapping: nextMapping,
        meta: internal.meta,
      })
    },

    setSelection(selection: Selection): Transaction {
      return fromInternal({ ...internal, selection, selectionSet: true })
    },

    setMeta(key: string, value: unknown): Transaction {
      const meta = new Map(internal.meta)
      if (value === undefined)
        meta.delete(key)
      else meta.set(key, value)
      return fromInternal({ ...internal, meta })
    },

    getMeta<T = unknown>(key: string): T | undefined {
      return internal.meta.get(key) as T | undefined
    },

    scrollIntoView(): Transaction {
      return this.setMeta('scrollIntoView', true)
    },
  }
}
