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

  it('emits a specific diagnostic when no adapter matches the format', async () => {
    const runtime = createExportRuntime()
    const diagnostics: string[] = []

    const result = await runtime.exportDocument({
      format: 'pdf',
      input: {},
      onDiagnostic(diagnostic) {
        diagnostics.push(diagnostic.code)
      },
    })

    expect(result).toBeUndefined()
    expect(runtime.getState()).toMatchObject({ phase: 'failed', format: 'pdf' })
    expect(diagnostics).toEqual(['NO_EXPORT_ADAPTER'])
  })

  it('replaces adapters with the same id', async () => {
    const runtime = createExportRuntime()
    const calls: string[] = []

    runtime.registerAdapter({
      id: 'replaceable',
      format: 'pdf',
      async export() {
        calls.push('old')
      },
    })
    runtime.registerAdapter({
      id: 'replaceable',
      format: 'pdf',
      async export() {
        calls.push('new')
      },
    })

    await runtime.exportDocument({ format: 'pdf', input: {} })

    expect(calls).toEqual(['new'])
  })

  it('keeps first registered adapter as the default for the same format', async () => {
    const runtime = createExportRuntime()
    const calls: string[] = []

    runtime.registerAdapter({
      id: 'first',
      format: 'pdf',
      async export() {
        calls.push('first')
      },
    })
    runtime.registerAdapter({
      id: 'second',
      format: 'pdf',
      async export() {
        calls.push('second')
      },
    })

    await runtime.exportDocument({ format: 'pdf', input: {} })

    expect(calls).toEqual(['first'])
  })

  it('selects a same-format adapter whose validator accepts the input', async () => {
    const runtime = createExportRuntime()
    const calls: string[] = []

    runtime.registerAdapter<{ kind: 'invoice' }>({
      id: 'invoice',
      format: 'pdf',
      validateInput(input): input is { kind: 'invoice' } {
        return typeof input === 'object' && input !== null && 'kind' in input && input.kind === 'invoice'
      },
      async export() {
        calls.push('invoice')
      },
    })
    runtime.registerAdapter<{ kind: 'label' }>({
      id: 'label',
      format: 'pdf',
      validateInput(input): input is { kind: 'label' } {
        return typeof input === 'object' && input !== null && 'kind' in input && input.kind === 'label'
      },
      async export() {
        calls.push('label')
      },
    })

    await runtime.exportDocument({ format: 'pdf', input: { kind: 'label' } })

    expect(calls).toEqual(['label'])
  })

  it('fails with a specific diagnostic when format adapters reject the input', async () => {
    const runtime = createExportRuntime()
    const diagnostics: string[] = []

    runtime.registerAdapter<{ kind: 'invoice' }>({
      id: 'invoice',
      format: 'pdf',
      validateInput(input): input is { kind: 'invoice' } {
        return typeof input === 'object' && input !== null && 'kind' in input && input.kind === 'invoice'
      },
      async export() {},
    })

    const result = await runtime.exportDocument({
      format: 'pdf',
      input: { kind: 'unknown' },
      onDiagnostic(diagnostic) {
        diagnostics.push(diagnostic.code)
      },
    })

    expect(result).toBeUndefined()
    expect(runtime.getState()).toMatchObject({ phase: 'failed', format: 'pdf' })
    expect(diagnostics).toEqual(['EXPORT_INPUT_INVALID'])
  })
})
