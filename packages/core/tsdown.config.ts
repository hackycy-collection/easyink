import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/view.ts'],
  dts: true,
  exports: true,
  publint: true,
})
