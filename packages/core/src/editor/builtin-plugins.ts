import type { MaterialNode } from '@easyink/schema'
import type { AnyVNode, DeepPanelContext, EditorState, PanelContribution, Plugin, ToolbarItem, Transaction } from './types'
import { Fragment, h } from 'preact'
import { SetPropStep } from './steps/set-prop'

const GEOMETRY_SCHEMAS = [
  { key: 'x', label: 'X', type: 'number' },
  { key: 'y', label: 'Y', type: 'number' },
  { key: 'width', label: 'W', type: 'number' },
  { key: 'height', label: 'H', type: 'number' },
  { key: 'rotation', label: 'Rotation', type: 'number' },
  { key: 'alpha', label: 'Alpha', type: 'number', min: 0, max: 1, step: 0.01 },
] as const

const VISIBILITY_SCHEMAS = [
  { key: 'hidden', label: 'Hidden', type: 'boolean' },
  { key: 'locked', label: 'Locked', type: 'boolean' },
] as const

function readGeometry(node: MaterialNode, key: string): unknown {
  switch (key) {
    case 'x': return node.x
    case 'y': return node.y
    case 'width': return node.width
    case 'height': return node.height
    case 'rotation': return node.rotation ?? 0
    case 'alpha': return node.alpha ?? 1
    default: return undefined
  }
}

/**
 * core/geometry：为选中元素提供位置/尺寸/旋转/透明度面板。
 */
export const geometryPlugin: Plugin = {
  key: 'core/geometry',
  propertyPanel(ctx) {
    const sel = ctx.state.selection
    if (sel.type !== 'element' || !sel.nodeId)
      return []
    const node = ctx.state.doc.elements.find(el => el.id === sel.nodeId)
    if (!node)
      return []
    const contribution: PanelContribution = {
      id: 'core/geometry',
      order: 0,
      title: ctx.t('designer.property.geometry') || 'Geometry',
      schemas: GEOMETRY_SCHEMAS,
      readValue: key => readGeometry(node, key),
      writeValue: (key, value) => {
        const tr = ctx.state.tr.step(new SetPropStep(node.id, key, value))
        ctx.dispatch(tr)
      },
    }
    return [contribution]
  },
}

/**
 * core/visibility：显示/锁定。
 */
export const visibilityPlugin: Plugin = {
  key: 'core/visibility',
  propertyPanel(ctx) {
    const sel = ctx.state.selection
    if (sel.type !== 'element' || !sel.nodeId)
      return []
    const node = ctx.state.doc.elements.find(el => el.id === sel.nodeId)
    if (!node)
      return []
    return [{
      id: 'core/visibility',
      order: 90,
      title: ctx.t('designer.property.visibility') || 'Visibility',
      schemas: VISIBILITY_SCHEMAS,
      readValue: (key) => {
        if (key === 'hidden')
          return node.hidden ?? false
        if (key === 'locked')
          return node.locked ?? false
        return undefined
      },
      writeValue: (key, value) => {
        ctx.dispatch(ctx.state.tr.step(new SetPropStep(node.id, key, value)))
      },
    }]
  },
}

// ─── Floating Toolbar aggregator ──────────────────────────────────

/**
 * 根据 doc 中节点几何，给出工具栏吸附锚点（mm 单位）。
 * 当 `nodeId === null` 时返回画布顶部坐标 (x:0, y:0)。
 */
function resolveToolbarAnchor(state: EditorState, nodeId: string | null): { x: number, y: number, w: number, h: number } | null {
  if (!nodeId)
    return { x: 0, y: 0, w: 0, h: 0 }
  const node = state.doc.elements.find(el => el.id === nodeId)
  if (!node)
    return null
  return { x: node.x, y: node.y, w: node.width, h: node.height }
}

interface ToolbarButtonAttrs {
  key: string
  class: string
  title: string
  disabled: boolean
  onClick: (event: MouseEvent) => void
}

function renderToolbarButton(item: ToolbarItem, state: EditorState, dispatch: (tr: Transaction) => void): AnyVNode {
  const enabled = item.enabled ? item.enabled(state) : true
  const attrs: ToolbarButtonAttrs = {
    key: item.id,
    class: `easyink-toolbar-btn${enabled ? '' : ' is-disabled'}`,
    title: item.label ?? item.id,
    disabled: !enabled,
    onClick: (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (!enabled)
        return
      item.run(state, dispatch)
    },
  }
  // 优先 icon（外部 svg 字符串），否则 label
  if (item.icon) {
    return h('button', attrs as unknown as Record<string, unknown>, h('span', {
      class: 'easyink-toolbar-icon',
      dangerouslySetInnerHTML: { __html: item.icon },
    }))
  }
  return h('button', attrs as unknown as Record<string, unknown>, item.label ?? item.id)
}

/**
 * floatingToolbarPlugin：聚合 `state.plugins[i].toolbar` 贡献并渲染浮动工具栏。
 *
 * 见 `.github/architecture/23-table-interaction.md` §23.5。
 *
 * - 每个可见 contribution 渲染为一条横向按钮组（32px 高）
 * - 多条浮条**顶部堆叠**（垂直方向，按 plugin 注册顺序）
 * - 单条吸附 anchor bbox 上方 8px；ymm < 0 时翻转到 bbox 下方
 * - mm 坐标输出到 `data-toolbar-anchor`，由 designer CSS 把 mm → 屏幕 px
 */
export const floatingToolbarPlugin: Plugin = {
  key: 'core/floating-toolbar',
  view: {
    render(ctx) {
      const { state, dispatch, layers } = ctx
      const stacks = new Map<string, AnyVNode[]>()

      for (const plugin of state.plugins) {
        const c = plugin.toolbar
        if (!c || !c.visible(state))
          continue
        const items = c.items(state)
        if (items.length === 0)
          continue
        const anchorId = c.anchorNodeId(state)
        const anchor = resolveToolbarAnchor(state, anchorId)
        if (!anchor)
          continue
        const anchorKey = anchorId ?? '__top__'
        const buttons = items.map(it => renderToolbarButton(it, state, dispatch))
        const bar = h(
          'div',
          {
            'key': c.ownerKey,
            'class': 'easyink-floating-toolbar',
            'data-owner': c.ownerKey,
          },
          buttons,
        )
        const arr = stacks.get(anchorKey) ?? []
        arr.push(bar)
        stacks.set(anchorKey, arr)
      }

      for (const [anchorKey, bars] of stacks) {
        const anchor = anchorKey === '__top__'
          ? { x: 0, y: 0, w: 0, h: 0 }
          : resolveToolbarAnchor(state, anchorKey)
        if (!anchor)
          continue
        const stack = h(
          'div',
          {
            'key': anchorKey,
            'class': 'easyink-floating-toolbar-stack',
            'data-toolbar-anchor': anchorKey,
            'data-anchor-x': anchor.x,
            'data-anchor-y': anchor.y,
            'data-anchor-w': anchor.w,
            'data-anchor-h': anchor.h,
            'style': `position:absolute;left:${anchor.x}mm;top:${anchor.y}mm;transform:translateY(calc(-100% - 2mm));pointer-events:auto;display:flex;flex-direction:column;gap:2px;z-index:10`,
          },
          bars,
        )
        layers.toolbar.push(stack)
      }
      return null
    },
  },
}

// ─── Deep panel aggregation helper ────────────────────────────────

/**
 * 由 designer/PropertiesPanel slot 调用，收集所有可见的 deepPanel 贡献。
 *
 * 返回一组待渲染的 preact VNode（无 wrapping）。designer 只需负责把它们
 * 串联挂到 panel 顶部。
 */
export function collectDeepPanels(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  t: (key: string) => string,
): AnyVNode[] {
  const out: AnyVNode[] = []
  for (const plugin of state.plugins) {
    const dp = plugin.deepPanel
    if (!dp || !dp.visible(state))
      continue
    const ctx: DeepPanelContext = {
      state,
      pluginState: state.getPluginState(plugin.key),
      dispatch,
      t,
    }
    const node = dp.view(ctx)
    if (node)
      out.push(h(Fragment, { key: dp.ownerKey }, node))
  }
  return out
}
