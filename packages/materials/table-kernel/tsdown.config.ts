import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/steps.ts'],
  dts: true,
  exports: true,
  publint: true,
})
