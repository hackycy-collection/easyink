import type { DocumentSchema } from './types'
import { isObject, SCHEMA_VERSION } from '@easyink/shared'

export interface SchemaValidationIssue {
  path: string
  message: string
  code: string
}

export type SchemaDeserializeErrorCode = 'invalid-json' | 'invalid-schema' | 'incompatible-version'

interface SchemaErrorOptions {
  cause?: unknown
  issues?: SchemaValidationIssue[]
  schemaVersion?: string
}

export class SchemaDeserializeError extends Error {
  readonly code: SchemaDeserializeErrorCode
  readonly cause?: unknown
  readonly issues?: SchemaValidationIssue[]
  readonly schemaVersion?: string
  readonly currentVersion = SCHEMA_VERSION

  constructor(code: SchemaDeserializeErrorCode, message: string, options: SchemaErrorOptions = {}) {
    super(message)
    this.name = 'SchemaDeserializeError'
    this.code = code
    this.cause = options.cause
    this.issues = options.issues
    this.schemaVersion = options.schemaVersion
  }
}

export class SchemaMigrationError extends Error {
  readonly cause?: unknown
  readonly issues: SchemaValidationIssue[]
  readonly schemaVersion?: string

  constructor(message: string, options: Omit<SchemaErrorOptions, 'issues'> & { issues: SchemaValidationIssue[] }) {
    super(message)
    this.name = 'SchemaMigrationError'
    this.cause = options.cause
    this.issues = options.issues
    this.schemaVersion = options.schemaVersion
  }
}

function createIssue(path: string, message: string, code: string): SchemaValidationIssue {
  return { path, message, code }
}

export function formatSchemaValidationIssue(issue: SchemaValidationIssue): string {
  return issue.path === '$' ? issue.message : `${issue.path}: ${issue.message}`
}

/**
 * Validate a schema has the minimum required fields.
 * Returns an array of error messages (empty if valid).
 */
export function validateSchema(schema: unknown): string[] {
  return validateSchemaIssues(schema).map(formatSchemaValidationIssue)
}

export function validateSchemaIssues(schema: unknown): SchemaValidationIssue[] {
  const issues: SchemaValidationIssue[] = []

  if (!isObject(schema)) {
    issues.push(createIssue('$', 'Schema must be an object', 'schema.type'))
    return issues
  }

  if (!schema.version || typeof schema.version !== 'string') {
    issues.push(createIssue('version', 'must be a string', 'schema.version.required'))
  }

  if (!schema.unit || typeof schema.unit !== 'string') {
    issues.push(createIssue('unit', 'must be a string', 'schema.unit.required'))
  }

  if (!isObject(schema.page)) {
    issues.push(createIssue('page', 'must be an object', 'schema.page.required'))
  }
  else {
    const page = schema.page
    if (!page.mode || typeof page.mode !== 'string') {
      issues.push(createIssue('page.mode', 'must be a string', 'schema.page.mode.required'))
    }
    if (typeof page.width !== 'number' || page.width <= 0) {
      issues.push(createIssue('page.width', 'must be a positive number', 'schema.page.width.invalid'))
    }
    if (typeof page.height !== 'number' || page.height <= 0) {
      issues.push(createIssue('page.height', 'must be a positive number', 'schema.page.height.invalid'))
    }
  }

  if (!isObject(schema.guides)) {
    issues.push(createIssue('guides', 'must be an object', 'schema.guides.required'))
  }

  if (!Array.isArray(schema.elements)) {
    issues.push(createIssue('elements', 'must be an array', 'schema.elements.required'))
  }

  return issues
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
  let parsed: unknown

  try {
    parsed = JSON.parse(json) as unknown
  }
  catch (error) {
    throw new SchemaDeserializeError('invalid-json', 'Failed to parse schema JSON.', { cause: error })
  }

  const issues = validateSchemaIssues(parsed)
  if (issues.length > 0) {
    throw new SchemaDeserializeError(
      'invalid-schema',
      `Invalid schema: ${issues.map(formatSchemaValidationIssue).join('; ')}`,
      { issues },
    )
  }

  const schemaVersion = (parsed as DocumentSchema).version
  if (!isCompatibleVersion(schemaVersion)) {
    throw new SchemaDeserializeError(
      'incompatible-version',
      `Incompatible schema version "${schemaVersion}". Current supported version is "${SCHEMA_VERSION}".`,
      { schemaVersion },
    )
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
