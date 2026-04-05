import type { DocumentSchema } from './types'
import { describe, expect, it } from 'vitest'
import { MigrationRegistry } from './migration'

describe('migrationRegistry', () => {
  it('registers a migration', () => {
    const reg = new MigrationRegistry()
    reg.register(0, '1.0.0', schema => schema as unknown as DocumentSchema)
    expect(reg.canMigrate('0.1.0')).toBe(true)
  })

  it('canMigrate returns true when version is current', () => {
    const reg = new MigrationRegistry()
    expect(reg.canMigrate('1.0.0')).toBe(true)
  })

  it('canMigrate returns false when no migration registered', () => {
    const reg = new MigrationRegistry()
    expect(reg.canMigrate('0.5.0')).toBe(false)
  })

  it('getMigrationPath returns empty for current version', () => {
    const reg = new MigrationRegistry()
    expect(reg.getMigrationPath('1.0.0')).toEqual([])
  })

  it('getMigrationPath returns the chain of versions', () => {
    const reg = new MigrationRegistry()
    reg.register(0, '1.0.0', schema => schema as unknown as DocumentSchema)
    const path = reg.getMigrationPath('0.5.0')
    expect(path).toEqual(['0.5.0', '1.0.0'])
  })

  it('migrate runs the migration chain', () => {
    const reg = new MigrationRegistry()
    reg.register(0, '1.0.0', (schema) => {
      return {
        version: '1.0.0',
        unit: (schema.unit as string) || 'mm',
        page: { mode: 'fixed', width: 210, height: 297 },
        guides: { x: [], y: [] },
        elements: [],
        migrated: true,
      } as unknown as DocumentSchema
    })

    const input = { version: '0.1.0', unit: 'pt' }
    const result = reg.migrate(input) as unknown as Record<string, unknown>
    expect(result.version).toBe('1.0.0')
    expect(result.migrated).toBe(true)
    expect(result.unit).toBe('pt')
  })

  it('migrate throws when no migration path exists', () => {
    const reg = new MigrationRegistry()
    expect(() => reg.migrate({ version: '0.1.0' })).toThrow(
      'No migration registered for major version 0',
    )
  })

  it('migrate returns schema as-is when already at current version', () => {
    const reg = new MigrationRegistry()
    const schema = {
      version: '1.0.0',
      unit: 'mm',
      page: { mode: 'fixed', width: 210, height: 297 },
      guides: { x: [], y: [] },
      elements: [],
    }
    const result = reg.migrate(schema)
    expect(result).toBe(schema)
  })
})
