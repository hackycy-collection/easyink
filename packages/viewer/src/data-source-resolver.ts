import type { BindingRef } from '@easyink/schema'
import type { DataSourceDescriptor, ViewerDiagnosticEvent } from './types'
import { resolveBindingValue } from '@easyink/core'

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
  if (Object.hasOwn(data, source.id))
    return data[source.id]
  if (source.tag && Object.hasOwn(data, source.tag))
    return data[source.tag]
  if (sourceCount === 1)
    return data
  return undefined
}

function hasBindingSource(binding: BindingRef, data: Record<string, unknown>): boolean {
  if (binding.sourceId && Object.hasOwn(data, binding.sourceId))
    return true
  if (binding.sourceTag && Object.hasOwn(data, binding.sourceTag))
    return true
  return false
}
