import type { DocumentSchema } from './types'
import { isObject, SCHEMA_VERSION } from '@easyink/shared'

/**
 * Validate a schema has the minimum required fields.
 * Returns an array of error messages (empty if valid).
 */
export function validateSchema(schema: unknown): string[] {
  const errors: string[] = []

  if (!isObject(schema)) {
    errors.push('Schema must be an object')
    return errors
  }

  if (!schema.version || typeof schema.version !== 'string') {
    errors.push('Schema must have a "version" string field')
  }

  if (!schema.unit || typeof schema.unit !== 'string') {
    errors.push('Schema must have a "unit" string field')
  }

  if (!isObject(schema.page)) {
    errors.push('Schema must have a "page" object field')
  }
  else {
    const page = schema.page
    if (!page.mode || typeof page.mode !== 'string') {
      errors.push('page.mode is required')
    }
    if (typeof page.width !== 'number' || page.width <= 0) {
      errors.push('page.width must be a positive number')
    }
    if (typeof page.height !== 'number' || page.height <= 0) {
      errors.push('page.height must be a positive number')
    }
  }

  if (!isObject(schema.guides)) {
    errors.push('Schema must have a "guides" object field')
  }

  if (!Array.isArray(schema.elements)) {
    errors.push('Schema must have an "elements" array field')
  }

  return errors
}

/**
 * Serialize a DocumentSchema to a JSON string.
 */
export function serializeSchema(schema: DocumentSchema): string {
  return JSON.stringify(schema)
}

/**
 * Deserialize a JSON string to DocumentSchema.
 * Throws if schema is invalid.
 */
export function deserializeSchema(json: string): DocumentSchema {
  const parsed = JSON.parse(json) as unknown
  const errors = validateSchema(parsed)
  if (errors.length > 0) {
    throw new Error(`Invalid schema: ${errors.join('; ')}`)
  }
  return parsed as DocumentSchema
}

/**
 * Check if a schema version is compatible with the current version.
 */
export function isCompatibleVersion(schemaVersion: string): boolean {
  const current = SCHEMA_VERSION.split('.').map(Number)
  const target = schemaVersion.split('.').map(Number)
  return current[0] === target[0]
}
