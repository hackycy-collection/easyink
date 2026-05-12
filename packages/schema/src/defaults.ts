import type { PageMode, UnitType } from '@easyink/shared'
import type { DocumentSchemaInput, GuideSchema, NormalizedDocumentSchema, PageSchema } from './types'
import { DEFAULT_PAGE_HEIGHT_MM, DEFAULT_PAGE_WIDTH_MM, isObject, SCHEMA_VERSION } from '@easyink/shared'
import { isValidSchema } from './validation'

const UNIT_TYPES = new Set<UnitType>(['mm', 'pt', 'px', 'inch'])
const PAGE_MODES = new Set<PageMode>(['fixed', 'stack', 'label'])

export function createDefaultPage(): PageSchema {
  return {
    mode: 'fixed',
    width: DEFAULT_PAGE_WIDTH_MM,
    height: DEFAULT_PAGE_HEIGHT_MM,
  }
}

export function createDefaultGuides(): GuideSchema {
  return {
    x: [],
    y: [],
  }
}

export function createDefaultSchema(): NormalizedDocumentSchema {
  return {
    version: SCHEMA_VERSION,
    unit: 'mm',
    page: createDefaultPage(),
    guides: createDefaultGuides(),
    elements: [],
  }
}

function isUnitType(value: unknown): value is UnitType {
  return typeof value === 'string' && UNIT_TYPES.has(value as UnitType)
}

function isPageMode(value: unknown): value is PageMode {
  return typeof value === 'string' && PAGE_MODES.has(value as PageMode)
}

function normalizePage(input: unknown, fallback: PageSchema): PageSchema {
  if (!isObject(input))
    return fallback

  return {
    ...fallback,
    ...input,
    mode: isPageMode(input.mode) ? input.mode : fallback.mode,
    width: typeof input.width === 'number' && input.width > 0 ? input.width : fallback.width,
    height: typeof input.height === 'number' && input.height > 0 ? input.height : fallback.height,
  }
}

function normalizeGuides(input: unknown, fallback: GuideSchema): GuideSchema {
  if (!isObject(input))
    return fallback

  return {
    ...fallback,
    ...input,
    x: Array.isArray(input.x) ? input.x : fallback.x,
    y: Array.isArray(input.y) ? input.y : fallback.y,
  }
}

export function normalizeDocumentSchema(input?: DocumentSchemaInput | null): NormalizedDocumentSchema {
  if (isValidSchema(input))
    return input

  const fallback = createDefaultSchema()
  if (!isObject(input))
    return fallback

  return {
    ...fallback,
    ...input,
    version: typeof input.version === 'string' && input.version.length > 0 ? input.version : fallback.version,
    unit: isUnitType(input.unit) ? input.unit : fallback.unit,
    page: normalizePage(input.page, fallback.page),
    guides: normalizeGuides(input.guides, fallback.guides),
    elements: Array.isArray(input.elements) ? input.elements : fallback.elements,
    groups: Array.isArray(input.groups) ? input.groups : undefined,
  }
}
