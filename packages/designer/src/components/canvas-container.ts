import type { InjectionKey } from 'vue'

export const CANVAS_CONTAINER_KEY: InjectionKey<() => HTMLElement | null> = Symbol('CanvasContainer')
