import lucideIcons from '@iconify-json/lucide/icons.json'
import { addCollection } from '@iconify/vue'

/**
 * Register the full Lucide icon collection for offline usage.
 * Call this once at app startup before rendering any Icon components.
 */
export function registerIcons(): void {
  addCollection(lucideIcons)
}

export { Icon } from '@iconify/vue'
