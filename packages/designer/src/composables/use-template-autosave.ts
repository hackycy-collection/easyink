import type { NormalizedDocumentSchema } from '@easyink/schema'
import type { DesignerStore } from '../store/designer-store'
import type { TemplateAutoSaveOptions } from '../types'
import { nextTick, onBeforeUnmount, watch } from 'vue'

const DEFAULT_SAVE_DELAY = 1000
const SUCCESS_RESET_DELAY = 1400

export interface TemplateAutoSaveController {
  markSchemaLoaded: () => void
}

export function useTemplateAutoSave(
  store: DesignerStore,
  getOptions: () => TemplateAutoSaveOptions | undefined,
): TemplateAutoSaveController {
  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  let successTimer: ReturnType<typeof setTimeout> | undefined
  let isSaving = false
  let saveQueuedWhileSaving = false
  let suppressNextSchemaChange = false
  let generation = 0

  function clearDebounceTimer(): void {
    if (!debounceTimer)
      return
    clearTimeout(debounceTimer)
    debounceTimer = undefined
  }

  function clearSuccessTimer(): void {
    if (!successTimer)
      return
    clearTimeout(successTimer)
    successTimer = undefined
  }

  function resetRuntimeState(): void {
    generation += 1
    clearDebounceTimer()
    clearSuccessTimer()
    isSaving = false
    saveQueuedWhileSaving = false
    store.resetTemplateSaveState()
  }

  function markSchemaLoaded(): void {
    suppressNextSchemaChange = true
    resetRuntimeState()
    void nextTick(() => {
      suppressNextSchemaChange = false
    })
  }

  function getDelay(options: TemplateAutoSaveOptions): number {
    return options.delay ?? DEFAULT_SAVE_DELAY
  }

  function cloneSchema(schema: NormalizedDocumentSchema): NormalizedDocumentSchema {
    return JSON.parse(JSON.stringify(schema)) as NormalizedDocumentSchema
  }

  function getErrorMessage(error: unknown): string | undefined {
    if (error instanceof Error)
      return error.message
    if (typeof error === 'string')
      return error
    return undefined
  }

  async function runSave(): Promise<void> {
    const options = getOptions()
    if (!options?.enabled)
      return

    if (isSaving) {
      saveQueuedWhileSaving = true
      store.queueSave()
      return
    }

    clearDebounceTimer()
    clearSuccessTimer()
    isSaving = true
    saveQueuedWhileSaving = false
    const saveGeneration = generation
    store.startSave()

    try {
      const schemaSnapshot = cloneSchema(store.schema)
      await options.save(schemaSnapshot)
      if (saveGeneration !== generation)
        return

      isSaving = false
      if (saveQueuedWhileSaving) {
        void runSave()
        return
      }

      store.completeSave()
      const successAt = store.workbench.status.saveUpdatedAt
      successTimer = setTimeout(() => {
        if (store.workbench.status.savePhase === 'success' && store.workbench.status.saveUpdatedAt === successAt)
          store.resetSaveIndicator()
      }, SUCCESS_RESET_DELAY)
    }
    catch (error) {
      if (saveGeneration !== generation)
        return

      isSaving = false
      if (saveQueuedWhileSaving) {
        void runSave()
        return
      }

      store.failSave(getErrorMessage(error))
    }
  }

  function scheduleSave(options: TemplateAutoSaveOptions): void {
    if (isSaving) {
      saveQueuedWhileSaving = true
      store.queueSave()
      return
    }

    clearDebounceTimer()
    clearSuccessTimer()
    store.queueSave()
    debounceTimer = setTimeout(() => {
      void runSave()
    }, getDelay(options))
  }

  watch(
    () => store.schema,
    () => {
      if (suppressNextSchemaChange)
        return

      const options = getOptions()
      if (!options?.enabled)
        return

      store.markDraftModified()
      scheduleSave(options)
    },
    { deep: true, flush: 'post' },
  )

  watch(
    () => getOptions()?.enabled,
    (enabled) => {
      if (!enabled)
        resetRuntimeState()
    },
  )

  onBeforeUnmount(() => {
    resetRuntimeState()
  })

  return { markSchemaLoaded }
}
