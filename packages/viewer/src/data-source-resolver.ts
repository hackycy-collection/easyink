import type { DataFieldNode } from '@easyink/datasource'
import type { BindingRef } from '@easyink/schema'
import type { DataSourceDescriptor, ViewerDiagnosticEvent } from './types'
import { resolveBindingValue } from '@easyink/core'
import { FIELD_PATH_SEPARATOR } from '@easyink/shared'

export interface ViewerDataResolution {
  data: Record<string, unknown>
  diagnostics: ViewerDiagnosticEvent[]
}

export function resolveViewerDataContext(input: {
  data?: Record<string, unknown>
  dataSources?: DataSourceDescriptor[]
}): ViewerDataResolution {
  const rawData = input.data ?? {}
  const dataSources = input.dataSources ?? []
  const diagnostics: ViewerDiagnosticEvent[] = []

  if (dataSources.length === 0) {
    return { data: rawData, diagnostics }
  }

  const resolved: Record<string, unknown> = {}
  for (const source of dataSources) {
    const value = resolveSourcePayload(source, rawData, dataSources.length)
    if (value === undefined) {
      diagnostics.push({
        category: 'datasource',
        severity: 'warning',
        code: 'DATASOURCE_DATA_MISSING',
        message: `No runtime data found for data source "${source.id}"`,
        scope: 'datasource',
        detail: { sourceId: source.id, sourceTag: source.tag },
      })
      continue
    }

    resolved[source.id] = value
    if (source.tag)
      resolved[source.tag] = value
  }

  return { data: resolved, diagnostics }
}

export function resolveBindingWithDiagnostics(input: {
  binding: BindingRef
  data: Record<string, unknown>
  dataSources?: DataSourceDescriptor[]
}): { value: unknown, diagnostics: ViewerDiagnosticEvent[] } {
  const diagnostics: ViewerDiagnosticEvent[] = []
  const hasDataSourceContract = (input.dataSources?.length ?? 0) > 0

  if (hasDataSourceContract && !hasBindingSource(input.binding, input.data)) {
    diagnostics.push({
      category: 'datasource',
      severity: 'warning',
      code: 'BINDING_SOURCE_MISSING',
      message: `Binding source "${input.binding.sourceId}" is not available`,
      scope: 'datasource',
      detail: {
        sourceId: input.binding.sourceId,
        sourceTag: input.binding.sourceTag,
        fieldPath: input.binding.fieldPath,
      },
    })
    return { value: undefined, diagnostics }
  }

  const value = resolveBindingValue(input.binding, input.data)
  if (hasDataSourceContract && value === undefined && input.binding.fieldPath) {
    diagnostics.push({
      category: 'datasource',
      severity: 'warning',
      code: 'BINDING_PATH_NOT_FOUND',
      message: `Binding path "${input.binding.fieldPath}" was not found`,
      scope: 'datasource',
      detail: {
        sourceId: input.binding.sourceId,
        sourceTag: input.binding.sourceTag,
        fieldPath: input.binding.fieldPath,
      },
    })
  }

  return { value, diagnostics }
}

function resolveSourcePayload(
  source: DataSourceDescriptor,
  data: Record<string, unknown>,
  sourceCount: number,
): unknown {
  const candidates: unknown[] = []
  if (Object.hasOwn(data, source.id))
    candidates.push(data[source.id])
  if (source.tag && Object.hasOwn(data, source.tag))
    candidates.push(data[source.tag])

  if (candidates.length > 0) {
    const rootScore = scoreSourcePayload(source, data)
    const bestCandidate = candidates
      .map(value => ({ value, score: scoreSourcePayload(source, value) }))
      .sort((a, b) => b.score - a.score)[0]!

    if (rootScore > bestCandidate.score)
      return data
    return bestCandidate.value
  }

  if (scoreSourcePayload(source, data) > 0)
    return data

  if (sourceCount === 1)
    return data
  return undefined
}

function scoreSourcePayload(source: DataSourceDescriptor, value: unknown): number {
  if (!isRecord(value))
    return 0

  let score = 0
  for (const path of collectSourceFieldPaths(source.fields)) {
    if (hasPath(value, path))
      score++
  }
  return score
}

function collectSourceFieldPaths(fields: DataFieldNode[] = []): string[] {
  const paths: string[] = []
  for (const field of fields) {
    if (field.path)
      paths.push(field.path)
    if (field.fields)
      paths.push(...collectSourceFieldPaths(field.fields))
  }
  return paths
}

function hasPath(value: unknown, path: string): boolean {
  const segments = path.split(FIELD_PATH_SEPARATOR).filter(Boolean)
  return hasSegments(value, segments)
}

function hasSegments(value: unknown, segments: string[]): boolean {
  if (segments.length === 0)
    return true
  if (Array.isArray(value))
    return value.some(item => hasSegments(item, segments))

  const [segment, ...rest] = segments
  if (!segment || !isRecord(value) || !Object.hasOwn(value, segment))
    return false
  return hasSegments(value[segment], rest)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function hasBindingSource(binding: BindingRef, data: Record<string, unknown>): boolean {
  if (binding.sourceId && Object.hasOwn(data, binding.sourceId))
    return true
  if (binding.sourceTag && Object.hasOwn(data, binding.sourceTag))
    return true
  return false
}
