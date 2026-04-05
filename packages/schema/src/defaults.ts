import type { DocumentSchema, GuideSchema, PageSchema } from './types'
import { DEFAULT_PAGE_HEIGHT_MM, DEFAULT_PAGE_WIDTH_MM, SCHEMA_VERSION } from '@easyink/shared'

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

export function createDefaultSchema(): DocumentSchema {
  return {
    version: SCHEMA_VERSION,
    unit: 'mm',
    page: createDefaultPage(),
    guides: createDefaultGuides(),
    elements: [],
  }
}
