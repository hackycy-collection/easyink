import { describe, expect, it } from 'vitest'
import { createExportRuntime } from './runtime'

describe('export runtime', () => {
  it('emits dispatch, prepare, export, and completed phases in order', async () => {
    const runtime = createExportRuntime()
    const phases: string[] = []
    const unsubscribe = runtime.subscribe((state) => {
      phases.push(state.phase)
    })

    runtime.registerAdapter({
      id: 'json-export',
      format: 'playground-demo-json',
      async prepare() {},
      async export(context) {
        return new Blob([JSON.stringify(context.input)], { type: 'application/json' })
      },
    })

    const result = await runtime.exportDocument({
      format: 'playground-demo-json',
      input: { ok: true },
      entry: 'preview',
    })

    unsubscribe()
    expect(result).toBeInstanceOf(Blob)
    expect(phases).toEqual(['idle', 'dispatching', 'preparing', 'exporting', 'completed'])
    expect(runtime.getState()).toMatchObject({ phase: 'completed', entry: 'preview', format: 'playground-demo-json' })
  })

  it('moves to failed and emits a diagnostic when an adapter throws', async () => {
    const runtime = createExportRuntime()
    const diagnostics: string[] = []
    runtime.registerAdapter({
      id: 'bad-export',
      format: 'pdf',
      async export() {
        throw new Error('boom')
      },
    })

    const result = await runtime.exportDocument({
      format: 'pdf',
      input: {},
      onDiagnostic(diagnostic) {
        diagnostics.push(diagnostic.code)
      },
    })

    expect(result).toBeUndefined()
    expect(runtime.getState()).toMatchObject({ phase: 'failed', format: 'pdf', error: 'boom' })
    expect(diagnostics).toContain('EXPORT_RUNTIME_ERROR')
  })

  it('throws adapter failures when throwOnError is enabled', async () => {
    const runtime = createExportRuntime()
    runtime.registerAdapter({
      id: 'bad-export',
      format: 'pdf',
      async export() {
        throw new Error('boom')
      },
    })

    await expect(runtime.exportDocument({ format: 'pdf', input: {}, throwOnError: true })).rejects.toThrow('boom')
    expect(runtime.getState()).toMatchObject({ phase: 'failed', format: 'pdf', error: 'boom' })
  })
})
