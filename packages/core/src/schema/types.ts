import type { BackgroundStyle, BorderStyle, Spacing } from '@easyink/shared'

// ─── 顶层 Schema ───

/**
 * 模板 Schema — 整个系统的唯一真相来源
 */
export interface TemplateSchema {
  /** Schema 版本号，遵循 SemVer */
  version: string
  /** 模板元信息 */
  meta: TemplateMeta
  /** 页面设置 */
  page: PageSettings
  /** 页面区域定义 */
  regions: RegionDefinition[]
  /** 元素树 */
  elements: ElementNode[]
  /** 扩展字段，供插件使用 */
  extensions?: Record<string, unknown>
}

/**
 * 模板元信息
 */
export interface TemplateMeta {
  /** 模板名称 */
  name: string
  /** 模板描述 */
  description?: string
  /** 创建时间 */
  createdAt?: string
  /** 更新时间 */
  updatedAt?: string
}

// ─── 页面设置 ───

/**
 * 页面设置
 */
export interface PageSettings {
  /** 纸张尺寸，预设名或自定义 */
  paper: PaperPreset | CustomPaper
  /** 页面方向 */
  orientation: 'portrait' | 'landscape'
  /** 页边距 */
  margins: Spacing
  /** 单位（用户选择的单位，内部存储即使用该单位） */
  unit: 'mm' | 'inch' | 'pt'
  /** 背景 */
  background?: BackgroundStyle
}

/**
 * 自定义纸张尺寸
 */
export interface CustomPaper {
  type: 'custom'
  width: number
  height: number
}

/**
 * 纸张预设
 */
export type PaperPreset
  = | 'A3' | 'A4' | 'A5' | 'A6'
    | 'B5' | 'Letter' | 'Legal'
    | LabelPaper

/**
 * 标签纸张
 */
export interface LabelPaper {
  type: 'label'
  width: number
  height: number
}

// ─── 区域模型 ───

/**
 * 区域定义 — 页面分为 header / body / footer 三个区域
 */
export interface RegionDefinition {
  /** 区域类型 */
  type: 'header' | 'body' | 'footer'
  /** 区域高度（使用页面单位） */
  height: number | 'auto'
  /** 该区域内的元素 ID 列表 */
  elementIds: string[]
  /** 是否每页重复（header/footer 默认 true） */
  repeatOnPage?: boolean
}

// ─── 元素节点 ───

/**
 * 元素节点 — Schema 中的元素定义
 */
export interface ElementNode {
  /** 全局唯一 ID */
  id: string
  /** 元素类型标识（可被插件扩展） */
  type: string
  /** 显示名称（图层面板显示） */
  name?: string
  /** 定位与尺寸 */
  layout: ElementLayout
  /** 元素类型特有属性（由元素类型定义声明） */
  props: Record<string, unknown>
  /** 样式属性 */
  style: ElementStyle
  /** 数据绑定配置 */
  binding?: DataBinding
  /** 条件渲染（由表达式插件提供） */
  condition?: ConditionConfig
  /** 子元素（仅容器类型） */
  children?: ElementNode[]
  /** 分页行为 */
  pagination?: ElementPaginationConfig
  /** 锁定状态 */
  locked?: boolean
  /** 隐藏状态 */
  hidden?: boolean
  /** 扩展字段 */
  extensions?: Record<string, unknown>
}

/**
 * 元素布局
 */
export interface ElementLayout {
  /** 定位模式 */
  position: 'absolute' | 'flow'
  /** absolute 模式下的坐标（使用页面单位） */
  x?: number
  y?: number
  /** 尺寸 */
  width: number | 'auto'
  height: number | 'auto'
  /** 旋转角度（度） */
  rotation?: number
  /** 层级 */
  zIndex?: number
}

/**
 * 元素样式
 */
export interface ElementStyle {
  /** 字体 */
  fontFamily?: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  /** 文本 */
  color?: string
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  lineHeight?: number
  letterSpacing?: number
  textDecoration?: 'none' | 'underline' | 'line-through'
  /** 背景 */
  backgroundColor?: string
  /** 边框 */
  border?: BorderStyle
  /** 内边距 */
  padding?: Spacing
  /** 透明度 */
  opacity?: number
}

// ─── 数据绑定 ───

/**
 * 数据绑定配置
 */
export interface DataBinding {
  /** 数据路径表达式，使用命名空间隔离，如 "order.customer.name" */
  path?: string
  /** 表达式（由表达式引擎插件解析） */
  expression?: string
  /** 格式化器 */
  formatter?: FormatterConfig
  /** 循环绑定（用于表格，仅支持单层 repeat） */
  repeat?: RepeatBinding
}

/**
 * 循环绑定
 */
export interface RepeatBinding {
  /** 数据源路径（必须指向数组，使用完整命名空间路径） */
  source: string
  /** 循环变量名，默认 "item" */
  itemAlias?: string
  /** 索引变量名，默认 "index" */
  indexAlias?: string
}

/**
 * 格式化器配置
 */
export interface FormatterConfig {
  /** 格式化器类型（内置或插件注册） */
  type: string
  /** 格式化参数 */
  options?: Record<string, unknown>
}

// ─── 条件渲染 ───

/**
 * 条件渲染配置
 */
export interface ConditionConfig {
  /** 条件表达式 */
  expression: string
}

// ─── 分页配置 ───

/**
 * 元素分页配置
 */
export interface ElementPaginationConfig {
  /** 分页行为 */
  behavior: 'normal' | 'fixed' | 'locked-to-last-page' | 'locked-to-every-page'
  /** 跨页时是否保持可见（如表格的表头续打） */
  repeatOnBreak?: boolean
  /** 禁止在此元素内部分页（如签名区） */
  avoidBreakInside?: boolean
}
