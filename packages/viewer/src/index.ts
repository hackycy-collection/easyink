import type { ViewerOptions } from './types'
import { ViewerRuntime } from './runtime'

export function createViewer(options?: ViewerOptions): ViewerRuntime {
  return new ViewerRuntime(options)
}

export { ViewerRuntime } from './runtime'
export type * from './types'
