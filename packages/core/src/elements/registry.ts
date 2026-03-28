import type { ElementTypeDefinition } from './types'

/**
 * 元素类型注册中心 — 管理所有元素类型定义
 *
 * 支持内置元素和插件扩展元素。同名注册时后者覆盖前者。
 */
export class ElementRegistry {
  private definitions = new Map<string, ElementTypeDefinition>()

  /**
   * 注册元素类型定义
   *
   * 如果已存在同 type 的定义，将被覆盖。
   * @param definition - 元素类型定义
   * @throws {TypeError} 如果 type 为空字符串
   */
  register(definition: ElementTypeDefinition): void {
    if (!definition.type)
      throw new TypeError('[EasyInk] Element type must be a non-empty string')

    this.definitions.set(definition.type, definition)
  }

  /**
   * 批量注册元素类型定义
   * @param definitions - 元素类型定义数组
   */
  registerAll(definitions: ElementTypeDefinition[]): void {
    for (const def of definitions) {
      this.register(def)
    }
  }

  /**
   * 注销元素类型定义
   * @param type - 元素类型标识
   * @returns 是否成功注销（type 不存在时返回 false）
   */
  unregister(type: string): boolean {
    return this.definitions.delete(type)
  }

  /**
   * 获取元素类型定义
   * @param type - 元素类型标识
   * @returns 元素类型定义，不存在则返回 undefined
   */
  get(type: string): ElementTypeDefinition | undefined {
    return this.definitions.get(type)
  }

  /**
   * 检查元素类型是否已注册
   * @param type - 元素类型标识
   */
  has(type: string): boolean {
    return this.definitions.has(type)
  }

  /**
   * 获取所有已注册的元素类型定义
   * @returns 元素类型定义数组（按注册顺序）
   */
  list(): ElementTypeDefinition[] {
    return [...this.definitions.values()]
  }

  /**
   * 获取所有已注册的元素类型标识
   * @returns 类型标识数组
   */
  types(): string[] {
    return [...this.definitions.keys()]
  }

  /**
   * 清空所有已注册的元素类型
   */
  clear(): void {
    this.definitions.clear()
  }
}
