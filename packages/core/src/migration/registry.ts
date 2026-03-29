import type { TemplateSchema } from '../schema'
import { SCHEMA_VERSION } from '../schema'

/**
 * 迁移函数类型
 *
 * 接收旧版 Schema（untyped），返回迁移后的 TemplateSchema。
 * 迁移函数负责更新 version 字段。
 */
export type MigrationFunction = (schema: Record<string, unknown>) => TemplateSchema

/**
 * MigrationRegistry — Schema 版本迁移注册表
 *
 * 管理 major 版本间的迁移函数，支持自动链式迁移。
 * Minor/Patch 升级（同 major 内）视为向后兼容，无需迁移。
 *
 * @example
 * ```ts
 * const registry = new MigrationRegistry()
 * registry.register(0, '1.0.0', (old) => ({
 *   ...old,
 *   version: '1.0.0',
 *   // ... transform fields
 * }))
 * const migrated = registry.migrate({ version: '0.1.0', ... })
 * ```
 */
export class MigrationRegistry {
  private _migrations = new Map<number, { to: string, migrate: MigrationFunction }>()

  /**
   * 注册版本迁移函数
   * @param fromMajor - 源 major 版本号（如 0、1、2）
   * @param to - 目标版本（完整 SemVer，如 '1.0.0'）
   * @param migrate - 迁移函数
   */
  register(fromMajor: number, to: string, migrate: MigrationFunction): void {
    this._migrations.set(fromMajor, { to, migrate })
  }

  /**
   * 迁移 schema 到当前库版本 (SCHEMA_VERSION)
   *
   * 流程：
   * 1. 解析 schema.version 的 major
   * 2. 如果 major === 当前 major，同 major 内视为兼容，更新 version 即返回
   * 3. 如果 major > 当前 major，抛错（需升级库）
   * 4. 依次执行 fromMajor → to 的迁移函数，直到达到当前 major
   * 5. 最终更新 version 为 SCHEMA_VERSION
   *
   * @throws {Error} 无法迁移（缺少迁移路径 或 版本高于当前）
   */
  migrate(schema: Record<string, unknown>): TemplateSchema {
    const version = schema.version as string | undefined
    if (!version) {
      throw new Error('Schema version is missing, cannot migrate')
    }

    const currentMajor = this._parseMajor(SCHEMA_VERSION)
    const schemaMajor = this._parseMajor(version)

    // 版本高于当前
    if (schemaMajor > currentMajor) {
      throw new Error(
        `Schema version ${version} is newer than the supported version ${SCHEMA_VERSION}. Please upgrade the library.`,
      )
    }

    // 同 major 内兼容
    if (schemaMajor === currentMajor) {
      return { ...(schema as unknown as TemplateSchema), version: SCHEMA_VERSION }
    }

    // 链式迁移
    let current: Record<string, unknown> = schema
    let major = schemaMajor

    while (major < currentMajor) {
      const migration = this._migrations.get(major)
      if (!migration) {
        throw new Error(
          `No migration registered for major version ${major}. Cannot migrate from ${version} to ${SCHEMA_VERSION}.`,
        )
      }
      current = migration.migrate(current) as unknown as Record<string, unknown>
      major = this._parseMajor((current as { version: string }).version)
    }

    // 最终确保 version 为当前版本
    const result = current as unknown as TemplateSchema
    result.version = SCHEMA_VERSION
    return result
  }

  /**
   * 检查是否可从指定版本迁移到当前版本
   */
  canMigrate(fromVersion: string): boolean {
    const currentMajor = this._parseMajor(SCHEMA_VERSION)
    const schemaMajor = this._parseMajor(fromVersion)

    if (schemaMajor >= currentMajor)
      return schemaMajor === currentMajor

    // 检查迁移链完整性
    let major = schemaMajor
    while (major < currentMajor) {
      if (!this._migrations.has(major))
        return false
      const migration = this._migrations.get(major)!
      major = this._parseMajor(migration.to)
    }
    return true
  }

  /**
   * 获取从指定版本到当前版本的迁移路径
   * @returns 版本号数组，如 ['0.1.0', '1.0.0', '2.0.0']
   */
  getMigrationPath(fromVersion: string): string[] {
    const currentMajor = this._parseMajor(SCHEMA_VERSION)
    const schemaMajor = this._parseMajor(fromVersion)

    if (schemaMajor >= currentMajor)
      return [fromVersion]

    const path: string[] = [fromVersion]
    let major = schemaMajor

    while (major < currentMajor) {
      const migration = this._migrations.get(major)
      if (!migration)
        return path
      path.push(migration.to)
      major = this._parseMajor(migration.to)
    }

    return path
  }

  /** 清空所有已注册迁移 */
  clear(): void {
    this._migrations.clear()
  }

  /** 解析版本字符串的 major 部分 */
  private _parseMajor(version: string): number {
    return Number.parseInt(version.split('.')[0], 10)
  }
}
