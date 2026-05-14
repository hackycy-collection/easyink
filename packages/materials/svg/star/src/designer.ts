import type { BehaviorRegistration, MaterialDesignerExtension, MaterialExtensionContext, MaterialGeometry, Rect, Selection, SelectionType, SubPropertySchema, TransactionAPI } from '@easyink/core'
import type { MaterialNode } from '@easyink/schema'
import type { SvgStarControlSelection, SvgStarProps } from './schema'
import { selectionMiddleware, undoBoundaryMiddleware } from '@easyink/core'
import { getNodeProps } from '@easyink/schema'
import { createPointerGesture } from '@easyink/shared'
import { computed, defineComponent, h } from 'vue'
import { buildStarSvgMarkup, getStarControlRect, getStarHandleRects, resolveStarControl, updateStarControlFromLocalPoint } from './rendering'
import { SVG_STAR_DEFAULTS } from './schema'

const STAR_CONTROL_SELECTION_TYPE = 'svg-star.control'

function createStarGeometry(): MaterialGeometry {
  return {
    getContentLayout(node) {
      return {
        contentBox: {
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
        },
      }
    },
    resolveLocation(selection, node) {
      if (selection.type !== STAR_CONTROL_SELECTION_TYPE)
        return []

      const props = {
        ...SVG_STAR_DEFAULTS,
        ...getNodeProps<SvgStarProps>(node),
      }
      return [getStarControlRect(node, props, selection.payload as SvgStarControlSelection)]
    },
    hitTest(point, node) {
      const props = {
        ...SVG_STAR_DEFAULTS,
        ...getNodeProps<SvgStarProps>(node),
      }
      const control = resolveStarControl(point, node, props)
      if (!control)
        return null

      return {
        type: STAR_CONTROL_SELECTION_TYPE,
        nodeId: node.id,
        payload: control,
      }
    },
  }
}

function createStarSelectionType(): SelectionType<SvgStarControlSelection> {
  return {
    id: STAR_CONTROL_SELECTION_TYPE,
    resolveLocation(sel, node) {
      const props = {
        ...SVG_STAR_DEFAULTS,
        ...getNodeProps<SvgStarProps>(node),
      }
      return [getStarControlRect(node, props, sel.payload)]
    },
    validate(payload): payload is SvgStarControlSelection {
      if (typeof payload !== 'object' || payload === null)
        return false
      const handle = (payload as SvgStarControlSelection).handle
      return handle === 'inner-radius' || handle === 'rotation'
    },
    getPropertySchema(sel, node) {
      return createStarSubPropertySchema(sel, node)
    },
  }
}

function createStarSubPropertySchema(_selection: Selection<SvgStarControlSelection>, node: MaterialNode): SubPropertySchema {
  const schemas = [
    { key: 'starInnerRatio', label: '星角大小', type: 'number', group: 'shape', min: 0.08, max: 0.95, step: 0.01 },
    { key: 'starRotation', label: '星角角度', type: 'number', group: 'shape', min: -180, max: 180, step: 1 },
  ]

  return {
    title: '星星编辑',
    schemas,
    read(key) {
      const props = {
        ...SVG_STAR_DEFAULTS,
        ...getNodeProps<SvgStarProps>(node),
      }
      if (key === 'starInnerRatio')
        return props.starInnerRatio
      if (key === 'starRotation')
        return props.starRotation
      return undefined
    },
    write(key, value, tx: TransactionAPI) {
      if (key !== 'starInnerRatio' && key !== 'starRotation')
        return
      const numericValue = typeof value === 'number' ? value : Number(value)
      if (Number.isNaN(numericValue))
        return
      tx.run<MaterialNode>(node.id, (draft) => {
        const draftProps = draft.props ?? (draft.props = {})
        draftProps[key] = key === 'starInnerRatio'
          ? Math.min(0.95, Math.max(0.08, numericValue))
          : normalizeStarDegrees(numericValue)
      }, {
        mergeKey: `svg-star:property:${key}`,
        label: 'designer.history.updateSvgStar',
      })
    },
  }
}

function normalizeStarDegrees(value: number): number {
  let normalized = value
  while (normalized > 180)
    normalized -= 360
  while (normalized <= -180)
    normalized += 360
  return normalized
}

function createStarHandleBehavior(): BehaviorRegistration {
  return {
    id: 'svg-star.handle-command',
    eventKinds: ['command'],
    middleware: async (ctx, next) => {
      if (ctx.event.kind !== 'command') {
        await next()
        return
      }

      if (ctx.event.command === 'svg-star.select-handle') {
        const handle = (ctx.event.payload as SvgStarControlSelection).handle
        ctx.selectionStore.set({
          type: STAR_CONTROL_SELECTION_TYPE,
          nodeId: ctx.node.id,
          payload: { handle },
        })
        return
      }

      if (ctx.event.command === 'svg-star.adjust-handle') {
        const payload = ctx.event.payload as { handle: SvgStarControlSelection['handle'], clientX: number, clientY: number }
        const documentPoint = ctx.geometry.screenToDocument({ x: payload.clientX, y: payload.clientY })
        const localPoint = ctx.geometry.documentToLocal(documentPoint, ctx.node)
        const currentProps = {
          ...SVG_STAR_DEFAULTS,
          ...getNodeProps<SvgStarProps>(ctx.node),
        }
        const nextProps = updateStarControlFromLocalPoint(ctx.node, currentProps, payload.handle, localPoint)
        ctx.tx.run<MaterialNode>(ctx.node.id, (draft) => {
          draft.props = {
            ...(draft.props ?? {}),
            ...nextProps,
          }
        }, {
          mergeKey: `svg-star:${payload.handle}`,
          label: 'designer.history.updateSvgStar',
        })
        return
      }

      await next()
    },
  }
}

function createStarDecorationComponent() {
  return defineComponent({
    name: 'SvgStarDecoration',
    props: {
      rects: { type: Array as () => Rect[], required: true },
      selection: { type: Object as () => Selection, required: true },
      node: { type: Object as () => MaterialNode, required: true },
      session: { type: Object as () => { dispatch: (event: unknown) => void }, required: true },
      unit: { type: String, required: true },
    },
    setup(props) {
      const currentHandle = computed(() => (props.selection.payload as SvgStarControlSelection).handle)
      const starProps = computed(() => ({
        ...SVG_STAR_DEFAULTS,
        ...getNodeProps<SvgStarProps>(props.node),
      }))
      const handleRects = computed(() => getStarHandleRects(props.node, starProps.value))

      function onHandlePointerDown(handle: SvgStarControlSelection['handle'], event: PointerEvent) {
        event.stopPropagation()
        event.preventDefault()
        props.session.dispatch({ kind: 'command', command: 'svg-star.select-handle', payload: { handle } })
        createPointerGesture({
          target: event.currentTarget as HTMLElement,
          event,
          onMove(moveEvent) {
            props.session.dispatch({
              kind: 'command',
              command: 'svg-star.adjust-handle',
              payload: {
                handle,
                clientX: moveEvent.clientX,
                clientY: moveEvent.clientY,
              },
            })
          },
          onEnd() {},
        })
      }

      function renderHandle(handle: SvgStarControlSelection['handle'], label: string) {
        const rect = handleRects.value[handle]
        const selected = currentHandle.value === handle
        return h('div', {
          style: {
            position: 'absolute',
            left: `${rect.x}${props.unit}`,
            top: `${rect.y}${props.unit}`,
            width: `${rect.width}${props.unit}`,
            height: `${rect.height}${props.unit}`,
            borderRadius: '999px',
            background: selected ? '#1890ff' : '#ffffff',
            border: '2px solid #1890ff',
            boxSizing: 'border-box',
            boxShadow: selected ? '0 0 0 4px rgba(24, 144, 255, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.18)',
            cursor: handle === 'rotation' ? 'grab' : 'ns-resize',
            pointerEvents: 'auto',
          },
          title: label,
          onPointerdown: (event: PointerEvent) => onHandlePointerDown(handle, event),
        })
      }

      return () => {
        const selectedRect = props.rects[0]
        const overlays = []

        if (selectedRect) {
          overlays.push(h('div', {
            style: {
              position: 'absolute',
              left: `${selectedRect.x - 2}${props.unit}`,
              top: `${selectedRect.y - 2}${props.unit}`,
              width: `${selectedRect.width + 4}${props.unit}`,
              height: `${selectedRect.height + 4}${props.unit}`,
              borderRadius: '999px',
              border: '1px dashed rgba(24, 144, 255, 0.8)',
              pointerEvents: 'none',
            },
          }))
        }

        overlays.push(renderHandle('inner-radius', '调整内角'))
        overlays.push(renderHandle('rotation', '旋转星角'))

        return h('div', {}, overlays)
      }
    },
  })
}

export function createSvgStarExtension(_context: MaterialExtensionContext): MaterialDesignerExtension {
  return {
    renderContent(nodeSignal, container) {
      function render() {
        const props = {
          ...SVG_STAR_DEFAULTS,
          ...getNodeProps<SvgStarProps>(nodeSignal.get()),
        }
        container.innerHTML = buildStarSvgMarkup(props)
      }

      render()
      return nodeSignal.subscribe(render)
    },
    geometry: createStarGeometry(),
    selectionTypes: [createStarSelectionType() as SelectionType<unknown>],
    behaviors: [
      selectionMiddleware(),
      undoBoundaryMiddleware({ groupBy: 'svg-star-control' }),
      createStarHandleBehavior(),
    ],
    decorations: [{
      selectionTypes: [STAR_CONTROL_SELECTION_TYPE],
      component: createStarDecorationComponent(),
      layer: 'above-handles',
    }],
  }
}
