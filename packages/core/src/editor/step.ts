import type { DocumentSchema } from '@easyink/schema'
import type { Step, StepJSON, StepSpec } from './types'

const registry = new Map<string, StepSpec>()

export function registerStepType(spec: StepSpec): void {
  registry.set(spec.stepType, spec)
}

export function getStepSpec(stepType: string): StepSpec | undefined {
  return registry.get(stepType)
}

export function deserializeStep(json: StepJSON, doc: DocumentSchema): Step {
  const spec = registry.get(json.stepType)
  if (!spec)
    throw new Error(`[editor] unknown step type: ${json.stepType}`)
  return spec.fromJSON(json, doc)
}
