/**
 * defineMaterial：把若干 Plugin + 建模信息聚合成"一个物料的完整交互定义"。
 * 见 `.github/architecture/22-editor-core.md` §22.3 / §22.16。
 */

import type { DocumentSchema, MaterialNode } from '@easyink/schema'
import type { AnyPlugin } from './types'

export interface MaterialExtension<TNode extends MaterialNode = MaterialNode> {
  readonly type: string
  readonly category?: string
  /** 物料节点 JSON Schema / 默认值（由物料包维护） */
  readonly schema?: unknown
  /** 构造一个默认节点（host 在 Add 物料时调用） */
  readonly createDefaultNode?: (partial?: Partial<TNode>, unit?: string) => TNode
  /** 构成该物料交互的 plugin 集合 */
  readonly plugins: readonly AnyPlugin[]
  /**
   * 可选：物料级能力声明（resizable / bindable 等）。
   * 仅作为宿主 UI 查询之用，不影响 core 行为。
   */
  readonly capabilities?: Readonly<Record<string, unknown>>
}

export interface DefineMaterialConfig<TNode extends MaterialNode = MaterialNode> {
  type: string
  category?: string
  schema?: unknown
  createDefaultNode?: (partial?: Partial<TNode>, unit?: string) => TNode
  plugins: readonly AnyPlugin[]
  capabilities?: Readonly<Record<string, unknown>>
}

export function defineMaterial<TNode extends MaterialNode = MaterialNode>(
  config: DefineMaterialConfig<TNode>,
): MaterialExtension<TNode> {
  if (!config.type)
    throw new Error('[defineMaterial] type is required')
  if (!Array.isArray(config.plugins) || config.plugins.length === 0)
    throw new Error(`[defineMaterial:${config.type}] plugins must be a non-empty array`)

  // plugin.key 去重
  const keys = new Set<string>()
  for (const p of config.plugins) {
    if (keys.has(p.key))
      throw new Error(`[defineMaterial:${config.type}] duplicate plugin.key "${p.key}"`)
    keys.add(p.key)
  }

  return Object.freeze({
    type: config.type,
    category: config.category,
    schema: config.schema,
    createDefaultNode: config.createDefaultNode,
    plugins: Object.freeze([...config.plugins]),
    capabilities: config.capabilities ? Object.freeze({ ...config.capabilities }) : undefined,
  })
}

/**
 * 从多个 MaterialExtension 收集所有 plugins（用于构造 EditorState.plugins）。
 * 不做去重——plugin.key 冲突由宿主负责处理。
 */
export function collectMaterialPlugins(materials: readonly MaterialExtension[]): AnyPlugin[] {
  const out: AnyPlugin[] = []
  for (const m of materials) out.push(...m.plugins)
  return out
}

export function findMaterial(
  materials: readonly MaterialExtension[],
  type: string,
): MaterialExtension | undefined {
  return materials.find(m => m.type === type)
}

/** 宿主创建新节点时用：根据 type 路由到对应物料的 createDefaultNode */
export function createMaterialNode(
  materials: readonly MaterialExtension[],
  type: string,
  partial?: Partial<MaterialNode>,
  unit?: string,
): MaterialNode | null {
  const m = findMaterial(materials, type)
  if (!m || !m.createDefaultNode)
    return null
  return m.createDefaultNode(partial, unit)
}

// 未使用变量兜底（避免 lint 报 DocumentSchema 未使用）
export type _MaterialDocument = DocumentSchema
