import type { FormatterConfig } from '../schema'

/**
 * 字段树节点 — 递归 children 结构
 *
 * 非叶子节点（有 children）为分组标题，仅用于设计器展示分组。
 * 叶子节点（无 children）为可绑定字段，必须有 key。
 */
export interface DataFieldNode {
  /**
   * 字段唯一标识（叶子节点必填，分组节点可选）。
   * 禁止包含 '.'
   */
  key?: string
  /** 显示名称 */
  title: string
  /** 字段说明 */
  description?: string
  /**
   * 自定义完整绑定路径（叶子节点可选）。
   * 设计器拖拽时生成的 binding.path 使用此值。
   * 未指定时默认使用叶子节点的 key 作为 binding.path。
   * 典型用途：对象数组场景下设置 fullPath='orderItems.itemName'。
   */
  fullPath?: string
  /** 子节点（存在时为分组节点，可在设计器中展开/折叠） */
  children?: DataFieldNode[]
}

/**
 * 数据源注册项 — 由集成方（开发者）提供。
 * 一个注册项代表一棵字段树，在设计器中作为顶层分组展示。
 */
export interface DataSourceRegistration {
  /** 显示名称（字段树顶层分组标题） */
  displayName: string
  /** 图标（字段树分组图标） */
  icon?: string
  /** 字段树（递归 children 结构） */
  fields: DataFieldNode[]
}

/**
 * Built-in formatter types.
 */
export type BuiltinFormatterType = 'currency' | 'date' | 'lowercase' | 'number' | 'pad' | 'uppercase'

/**
 * Formatter function signature.
 */
export type FormatterFunction = (value: unknown, options?: Record<string, unknown>) => string

/**
 * Data source manager events.
 */
export interface DataSourceManagerEvents {
  registered: (name: string, registration: DataSourceRegistration) => void
  unregistered: (name: string) => void
}

export type { FormatterConfig }
