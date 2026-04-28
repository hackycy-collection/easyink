import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 8532,
    host: '0.0.0.0',
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
  plugins: [tailwindcss(), vue()],
})
