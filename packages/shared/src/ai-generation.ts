import type { PageMode } from './types'

/**
 * Domain identifier of an AI-generated template. Builtin domains are listed
 * for autocomplete; the type accepts arbitrary strings so that external
 * profiles can introduce their own domains without changing this file.
 */
export type AIGenerationDomain
  = | 'supermarket-receipt'
    | 'restaurant-receipt'
    | 'shipping-label'
    | 'business-document'
    | 'certificate'
    | 'generic'
    | (string & {})

export interface AIPageAssumption {
  mode: PageMode
  width: number
  height: number
  unit: 'mm'
  reason: string
}

/**
 * Deterministic generation plan shared between the AI panel and the
 * mcp-server. The plan is derived (by keyword inference, by an LLM call,
 * or supplied by the caller) before the intent stage so that paper size,
 * table strategy, and material hints are not left to the LLM that builds
 * the schema.
 */
export interface AIGenerationPlan {
  domain: AIGenerationDomain
  confidence: 'high' | 'medium' | 'low'
  page: AIPageAssumption
  fieldNaming: 'english-camel-path-chinese-label'
  tableStrategy: 'table-data-for-arrays' | 'table-static-for-fixed' | 'avoid-table'
  sampleData: 'required'
  materialHints: string[]
  warnings: string[]
}

export interface AIMaterialDescriptor {
  type: string
  description: string
  properties: string[]
  requiredProps?: string[]
  binding?: 'none' | 'single' | 'multi'
  usage?: string[]
  schemaRules?: string[]
  examples?: Array<Record<string, unknown>>
}
