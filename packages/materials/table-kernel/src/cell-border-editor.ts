import type { BorderSide, CellBorderSchema } from '@easyink/schema'
import { defineComponent, h, markRaw } from 'vue'

const SIDES = ['top', 'right', 'bottom', 'left'] as const
const SIDE_LABELS: Record<string, string> = {
  top: 'designer.property.borderTop',
  right: 'designer.property.borderRight',
  bottom: 'designer.property.borderBottom',
  left: 'designer.property.borderLeft',
}

/**
 * Custom four-side border editor for table cells.
 * Renders width + color inputs for each side.
 * Conforms to the CustomEditor contract (props: schema/value/t, emits: change).
 */
export const CellBorderEditor = markRaw(defineComponent({
  name: 'CellBorderEditor',
  props: {
    schema: { type: Object, required: true },
    value: { type: [Object, null] as unknown as () => CellBorderSchema | undefined, default: undefined },
    inheritedValue: { type: [Object, null] as unknown as () => CellBorderSchema | undefined, default: undefined },
    disabled: { type: Boolean, default: false },
    t: { type: Function as unknown as () => (key: string) => string, required: true },
  },
  emits: {
    change: (_key: string, _value: unknown) => true,
  },
  setup(props, { emit }) {
    function getSide(side: string): BorderSide | undefined {
      return (props.value as CellBorderSchema | undefined)?.[side as keyof CellBorderSchema]
    }

    function updateSide(side: string, field: keyof BorderSide, val: unknown) {
      const current = props.value as CellBorderSchema | undefined
      const currentSide = current?.[side as keyof CellBorderSchema]
      const updated: CellBorderSchema = {
        ...current,
        [side]: { ...currentSide, [field]: val },
      }
      emit('change', props.schema.key, updated)
    }

    const inputStyle = 'width:48px;height:24px;padding:2px 4px;border:1px solid var(--ei-border-color,#d0d0d0);border-radius:3px;font-size:12px;outline:none;box-sizing:border-box;'
    const colorStyle = 'width:28px;height:24px;padding:1px;border:1px solid var(--ei-border-color,#d0d0d0);border-radius:3px;cursor:pointer;'
    const rowStyle = 'display:flex;align-items:center;gap:6px;'
    const labelStyle = 'width:28px;font-size:11px;color:var(--ei-text-secondary,#666);flex-shrink:0;'

    return () => h('div', { style: 'display:flex;flex-direction:column;gap:4px;width:100%;' }, [
      ...SIDES.map(side =>
        h('div', { style: rowStyle }, [
          h('span', { style: labelStyle }, props.t(SIDE_LABELS[side])),
          h('input', {
            type: 'number',
            style: inputStyle,
            value: getSide(side)?.width ?? 0,
            disabled: props.disabled,
            min: 0,
            max: 10,
            step: 1,
            onInput: (e: Event) => updateSide(side, 'width', Number((e.target as HTMLInputElement).value)),
          }),
          h('input', {
            type: 'color',
            style: colorStyle,
            value: getSide(side)?.color ?? '#000000',
            disabled: props.disabled,
            onInput: (e: Event) => updateSide(side, 'color', (e.target as HTMLInputElement).value),
          }),
        ]),
      ),
    ])
  },
}))
