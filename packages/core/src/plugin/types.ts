/// <reference lib="dom" />

import type { ElementNode, TemplateSchema } from '../schema'
import type { AsyncEvent, SyncBailHook, SyncWaterfallHook } from './hooks'

// ─── 钩子事件载荷 ───

/**
 * Schema 变更事件
 */
export interface SchemaChangeEvent {
  /** 变更类型 */
  type: 'add' | 'remove' | 'update' | 'reorder'
  /** 受影响的元素 ID（如有） */
  elementId?: string
  /** 变更前的值（部分场景） */
  oldValue?: unknown
  /** 变更后的值（部分场景） */
  newValue?: unknown
}

/**
 * 渲染上下文
 */
export interface RenderContext {
  /** 数据源数据 */
  data: Record<string, unknown>
  /** 页码信息 */
  page: { number: number, total: number }
}

/**
 * 导出上下文
 */
export interface ExportContext {
  /** 导出格式 */
  format: 'pdf' | 'image' | 'print'
  /** 渲染后的页面 DOM 列表 */
  pages: HTMLElement[]
  /** 导出配置 */
  options: Record<string, unknown>
}

/**
 * 分页选项
 */
export interface PaginateOptions {
  /** 起始页码 */
  startPage?: number
  /** 可用区域高度覆盖 */
  availableHeight?: number
}

/**
 * 导出结果
 */
export interface ExportResult {
  /** 导出格式 */
  format: string
  /** 导出产物 */
  data: Blob | ArrayBuffer
}

/**
 * 分页结果
 */
export interface PageBreakResult {
  /** 分页后各页的元素列表 */
  pages: PageContent[]
  /** 总页数 */
  totalPages: number
}

/**
 * 单页内容
 */
export interface PageContent {
  /** 页码（从 1 开始） */
  pageNumber: number
  /** 该页包含的元素及其计算位置 */
  elements: PageElement[]
  /** 该页的 header 元素 */
  headerElements: PageElement[]
  /** 该页的 footer 元素 */
  footerElements: PageElement[]
}

/**
 * 页面元素（带计算后坐标）
 */
export interface PageElement {
  /** 元素节点 */
  node: ElementNode
  /** 计算后的坐标（页面单位） */
  x: number
  y: number
  width: number
  height: number
}

// ─── 插件钩子集合 ───

/**
 * 插件钩子体系 — 分类钩子
 *
 * 同步钩子（SyncHook）可拦截和修改核心流程
 * 异步事件（AsyncEvent）只做通知，不阻塞流程
 */
export interface PluginHooks {
  // ─── 同步钩子（可拦截/修改） ───

  /** 渲染前 — 可修改待渲染元素的属性 */
  beforeRender: SyncWaterfallHook<[ElementNode, RenderContext]>
  /** 渲染后 — 可修改生成的 DOM 节点 */
  afterRender: SyncWaterfallHook<[HTMLElement, ElementNode]>
  /** 分页前 — 可修改分页参数 */
  beforePaginate: SyncWaterfallHook<[PaginateOptions]>
  /** 导出前 — 可修改导出配置或注入内容 */
  beforeExport: SyncWaterfallHook<[ExportContext]>
  /** 元素创建前 — 可修改默认属性 */
  beforeElementCreate: SyncWaterfallHook<[ElementNode]>
  /** 数据解析前 — 可修改数据上下文 */
  beforeDataResolve: SyncWaterfallHook<[Record<string, unknown>]>
  /** Schema 变更前 — 可拦截或修改变更 */
  beforeSchemaChange: SyncBailHook<[SchemaChangeEvent], boolean>

  // ─── 异步事件（仅通知） ───

  /** Schema 已变更 */
  schemaChanged: AsyncEvent<[TemplateSchema]>
  /** 选中元素变更 */
  selectionChanged: AsyncEvent<[string[]]>
  /** 导出完成 */
  exportCompleted: AsyncEvent<[ExportResult]>
  /** 分页完成 */
  paginateCompleted: AsyncEvent<[PageBreakResult]>
  /** 设计器初始化完成 */
  designerReady: AsyncEvent<[]>
}

// ─── 插件定义 ───

/**
 * EasyInk 插件定义
 */
export interface EasyInkPlugin {
  /** 插件唯一标识 */
  name: string
  /** 插件版本 */
  version?: string
  /** 依赖的其他插件 */
  dependencies?: string[]
  /**
   * 插件安装方法
   * @param context - 插件上下文
   * @returns 可选的清理函数
   */
  install: (context: PluginContext) => void | (() => void)
}

// ─── 插件上下文 ───

/**
 * 插件上下文 — 插件 install 时接收的 API 集合
 *
 * 初版仅暴露 hooks，随后续模块完成逐步扩展
 */
export interface PluginContext {
  /** 钩子系统 */
  hooks: PluginHooks
}
