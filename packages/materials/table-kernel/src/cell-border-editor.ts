import type { BorderSide, CellBorderSchema } from '@easyink/schema'
import { EiColorPicker, EiInput } from '@easyink/ui'
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
 * Renders width + color inputs for each side using @easyink/ui form components.
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
        [side]: { ...currentSide, [field]: field === 'width' ? Number(val) : val },
      }
      emit('change', props.schema.key, updated)
    }

    const rowStyle = 'display:flex;align-items:center;gap:6px;'

    return () => h('div', { style: 'display:flex;flex-direction:column;gap:4px;width:100%;' }, [
      ...SIDES.map(side =>
        h('div', { style: rowStyle }, [
          h(EiInput, {
            'label': props.t(SIDE_LABELS[side]),
            'type': 'number',
            'modelValue': getSide(side)?.width ?? 0,
            'disabled': props.disabled,
            'onUpdate:modelValue': (v: string | number) => updateSide(side, 'width', v),
          }),
          h(EiColorPicker, {
            'modelValue': getSide(side)?.color ?? '#000000',
            'onUpdate:modelValue': (v: string) => updateSide(side, 'color', v),
          }),
        ]),
      ),
    ])
  },
}))
