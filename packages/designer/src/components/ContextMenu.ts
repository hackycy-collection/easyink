import { defineComponent, h, inject, onMounted, onUnmounted } from 'vue'
import { DESIGNER_INJECTION_KEY } from '../types'

export const ContextMenu = defineComponent({
  name: 'ContextMenu',
  setup() {
    const ctx = inject(DESIGNER_INJECTION_KEY)!

    function onDocumentMousedown(e: MouseEvent): void {
      // Close on outside click
      const target = e.target as HTMLElement
      if (!target.closest('.easyink-context-menu')) {
        ctx.contextMenu.hide()
      }
    }

    onMounted(() => {
      document.addEventListener('mousedown', onDocumentMousedown)
    })

    onUnmounted(() => {
      document.removeEventListener('mousedown', onDocumentMousedown)
    })

    return () => {
      const cm = ctx.contextMenu
      if (!cm.visible.value) {
        return null
      }

      const menuItems = cm.items.value.map((item) => {
        if (item.divider) {
          return h('div', {
            class: 'easyink-context-menu-divider',
            key: item.key,
          })
        }
        return h('div', {
          class: [
            'easyink-context-menu-item',
            item.disabled ? 'easyink-context-menu-item--disabled' : '',
          ],
          key: item.key,
          onMousedown: (e: MouseEvent) => {
            e.stopPropagation()
            if (item.disabled) {
              return
            }
            item.action()
            cm.hide()
          },
        }, ctx.locale.t(item.label) || item.key)
      })

      return h('div', {
        class: 'easyink-context-menu',
        style: {
          left: `${cm.x.value}px`,
          top: `${cm.y.value}px`,
        },
      }, menuItems)
    }
  },
})
