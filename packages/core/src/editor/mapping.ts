import type { Mapping, Selection, StepMap } from './types'

export const identityStepMap: StepMap = {
  mapSelection: sel => sel,
}

export function createMapping(maps: readonly StepMap[] = []): Mapping {
  return {
    maps,
    mapSelection(sel: Selection): Selection {
      let current: Selection | null = sel
      for (const map of maps) {
        if (current == null)
          return current!
        current = map.mapSelection(current)
      }
      // null 表示原选区目标被删除，此处不做降级，由调用方决定
      return current as Selection
    },
    append(map: StepMap): Mapping {
      return createMapping([...maps, map])
    },
  }
}

/**
 * 删除节点型 StepMap：当 selection.nodeId === removedId 时返回 null。
 */
export function nodeRemovedStepMap(removedId: string): StepMap {
  return {
    mapSelection(sel) {
      if (sel.nodeId === removedId)
        return null
      // element-range 中包含该 id 则过滤
      if (sel.type === 'element-range' && Array.isArray(sel.path)) {
        const next = (sel.path as readonly string[]).filter(id => id !== removedId)
        if (next.length === sel.path.length)
          return sel
        if (next.length === 0)
          return null
        // 保持同类型，重建
        return {
          type: 'element-range',
          nodeId: null,
          path: Object.freeze(next),
          toJSON: () => ({ type: 'element-range', nodeId: null, path: next }),
        }
      }
      return sel
    },
  }
}
