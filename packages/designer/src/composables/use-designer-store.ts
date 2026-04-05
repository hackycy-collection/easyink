import type { InjectionKey } from 'vue'
import type { DesignerStore } from '../store/designer-store'
import { inject, provide } from 'vue'

const DESIGNER_STORE_KEY: InjectionKey<DesignerStore> = Symbol('EasyInkDesignerStore')

export function provideDesignerStore(store: DesignerStore): void {
  provide(DESIGNER_STORE_KEY, store)
}

export function useDesignerStore(): DesignerStore {
  const store = inject(DESIGNER_STORE_KEY)
  if (!store) {
    throw new Error('useDesignerStore() must be used within EasyInkDesigner component')
  }
  return store
}
