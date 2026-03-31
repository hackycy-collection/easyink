import type { ComputedLayout, DataResolver, MaterialNode, PluginHooks, TemplateSchema, Unit } from '@easyink/core'

// ─── 渲染器接口 ───

/**
 * 渲染器接口 — 所有输出适配器必须实现
 */
export interface Renderer {
  /** 渲染器唯一标识 */
  readonly name: string

  /**
   * 将 Schema 渲染到目标容器（单页输出）
   */
  render: (
    schema: TemplateSchema,
    data: Record<string, unknown>,
    container: HTMLElement,
  ) => RenderResult

  /** 销毁渲染器，清理资源 */
  destroy: () => void
}

/**
 * 渲染结果
 */
export interface RenderResult {
  /** 渲染产生的页面 DOM 节点 */
  page: HTMLElement
  /** 实际渲染高度（CSS 像素，auto-extend 模式下可能大于声明高度） */
  actualHeight: number
  /** 销毁函数，移除 DOM 节点并清理资源 */
  dispose: () => void
}

// ─── DOMRenderer 配置 ───

/**
 * DOMRenderer 配置项
 */
export interface DOMRendererOptions {
  /** 屏幕 DPI（默认 96） */
  dpi?: number
  /** 缩放倍率（默认 1） */
  zoom?: number
  /** 可选的插件钩子（支持 beforeRender/afterRender） */
  hooks?: PluginHooks
  /** 设计模式：为 true 时渲染占位符而非实际数据（默认 false） */
  designMode?: boolean
}

// ─── 物料渲染 ───

/**
 * 物料渲染函数
 *
 * 每种物料类型对应一个渲染函数，将 MaterialNode 转为 HTMLElement。
 * 渲染函数不负责布局定位（由 DOMRenderer 统一处理），
 * 只负责物料内部内容的渲染。
 */
export type MaterialRenderFunction = (
  node: MaterialNode,
  context: MaterialRenderContext,
) => HTMLElement

/**
 * 物料渲染上下文 -- 传给每个物料渲染函数
 */
export interface MaterialRenderContext {
  /** 运行时数据 */
  data: Record<string, unknown>
  /** 数据解析器 */
  resolver: DataResolver
  /** 页面单位 */
  unit: Unit
  /** DPI */
  dpi: number
  /** 缩放倍率 */
  zoom: number
  /** 预绑定的单位转换函数（模板单位 -> CSS 像素） */
  toPixels: (value: number) => number
  /** 当前物料的计算后布局 */
  computedLayout: ComputedLayout
  /** 渲染子物料（容器类型使用） */
  renderChild: (child: MaterialNode) => HTMLElement
  /** 设计模式：为 true 时渲染占位符而非实际数据 */
  designMode?: boolean
}

// ─── ScreenRenderer 配置 ───

/**
 * ScreenRenderer 配置项
 */
export interface ScreenRendererOptions {
  /** 缩放倍率（默认 1） */
  zoom?: number
  /** 可选的插件钩子 */
  hooks?: PluginHooks
  /** 设计模式：为 true 时渲染占位符而非实际数据（默认 false） */
  designMode?: boolean
}
