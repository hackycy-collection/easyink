import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/render.ts',
    'src/interaction.ts',
  ],
  dts: true,
  exports: true,
  publint: true,
})
