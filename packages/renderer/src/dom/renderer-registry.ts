import type { MaterialRenderFunction } from '../types'

/**
 * MaterialRendererRegistry — 物料类型 → 渲染函数映射
 *
 * 渲染器侧的注册中心，将物料 type 字符串映射到对应的渲染函数。
 * 与 core 的 MaterialRegistry（声明性元信息）互补。
 */
export class MaterialRendererRegistry {
  private _renderers = new Map<string, MaterialRenderFunction>()

  /**
   * 注册物料渲染函数
   */
  register(type: string, fn: MaterialRenderFunction): void {
    this._renderers.set(type, fn)
  }

  /**
   * 注销物料渲染函数
   */
  unregister(type: string): boolean {
    return this._renderers.delete(type)
  }

  /**
   * 获取物料渲染函数
   */
  get(type: string): MaterialRenderFunction | undefined {
    return this._renderers.get(type)
  }

  /**
   * 是否已注册
   */
  has(type: string): boolean {
    return this._renderers.has(type)
  }

  /**
   * 清空所有注册
   */
  clear(): void {
    this._renderers.clear()
  }
}
