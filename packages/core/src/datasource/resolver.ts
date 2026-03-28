import type { FormatterConfig, FormatterFunction } from './types'

/** Properties that must never be accessed during path resolution (prototype pollution prevention) */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * DataResolver — resolves data values from flat data objects.
 *
 * Resolution strategy:
 * 1. Flat-first: check `path in data` → return `data[path]`
 * 2. Dot-path fallback: split by '.' into [arrayKey, field] (only one level)
 *    → `data[arrayKey].map(item => item[field])`
 *
 * Error strategy:
 * - Flat + dot-path both miss → returns undefined
 * - Dot-path arrayKey value is not an array → throws Error
 * - Dot-path has more than 2 segments → throws Error
 * - Path segment matches prototype property → returns undefined + warning
 * - Format exception → returns empty string
 *
 * Security: each path segment is checked against __proto__, constructor, prototype.
 */
export class DataResolver {
  private formatters = new Map<string, FormatterFunction>()

  /**
   * Register a formatter function.
   */
  registerFormatter(name: string, fn: FormatterFunction): void {
    this.formatters.set(name, fn)
  }

  /**
   * Unregister a formatter function.
   */
  unregisterFormatter(name: string): void {
    this.formatters.delete(name)
  }

  /**
   * Check if a formatter is registered.
   */
  hasFormatter(name: string): boolean {
    return this.formatters.has(name)
  }

  /**
   * Resolve a value from data by path.
   *
   * @param path - Flat key (e.g. 'orderNo') or dot-path (e.g. 'orderItems.itemName')
   * @param data - Flat data object, values can be scalars or object arrays
   * @returns The resolved value (scalar, array, or undefined)
   */
  resolve(path: string, data: Record<string, unknown>): unknown {
    if (!path)
      return undefined

    // Security check on the full path (for single-segment paths)
    if (FORBIDDEN_KEYS.has(path)) {
      console.warn(`[EasyInk] Blocked access to forbidden property: "${path}"`)
      return undefined
    }

    // 1. Flat-first: exact key match
    if (path in data) {
      return data[path]
    }

    // 2. Dot-path fallback
    const dotIndex = path.indexOf('.')
    if (dotIndex === -1) {
      // No dot, key not in data → undefined
      return undefined
    }

    const arrayKey = path.slice(0, dotIndex)
    const field = path.slice(dotIndex + 1)

    // Validate: only one level of nesting
    if (field.includes('.')) {
      throw new Error(
        `[EasyInk] Dot-path "${path}" has more than 2 segments. Only one level of nesting (arrayKey.field) is supported.`,
      )
    }

    // Security check on each segment
    if (FORBIDDEN_KEYS.has(arrayKey)) {
      console.warn(`[EasyInk] Blocked access to forbidden property: "${arrayKey}"`)
      return undefined
    }
    if (FORBIDDEN_KEYS.has(field)) {
      console.warn(`[EasyInk] Blocked access to forbidden property: "${field}"`)
      return undefined
    }

    const arrayData = data[arrayKey]

    // arrayKey not in data → undefined
    if (arrayData === undefined) {
      return undefined
    }

    // arrayKey value must be an array
    if (!Array.isArray(arrayData)) {
      throw new TypeError(
        `[EasyInk] Expected data["${arrayKey}"] to be an array for dot-path "${path}", but got ${typeof arrayData}.`,
      )
    }

    return arrayData.map((item: unknown) => {
      if (item == null)
        return undefined
      if (typeof item !== 'object')
        return undefined
      return (item as Record<string, unknown>)[field]
    })
  }

  /**
   * Format a value using a registered formatter.
   *
   * @param value - The raw value to format
   * @param formatter - Formatter configuration
   * @returns Formatted string, or the value coerced to string if no formatter found
   */
  format(value: unknown, formatter: FormatterConfig): string {
    const fn = this.formatters.get(formatter.type)
    if (!fn) {
      console.warn(`[EasyInk] Unknown formatter type: "${formatter.type}"`)
      return value == null ? '' : String(value)
    }
    return fn(value, formatter.options)
  }

  /**
   * Resolve and optionally format a value in one call.
   */
  resolveAndFormat(
    path: string,
    data: Record<string, unknown>,
    formatter?: FormatterConfig,
  ): string {
    const value = this.resolve(path, data)
    if (formatter) {
      return this.format(value, formatter)
    }
    return value == null ? '' : String(value)
  }

  /**
   * Clear all registered formatters.
   */
  clear(): void {
    this.formatters.clear()
  }
}
