import { resolve } from 'node:path'
import process from 'node:process'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

function escapeMetaContent(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
}

export default defineConfig(({ command }) => {
  const buildMeta = {
    sha: process.env.VITE_BUILD_SHA ?? 'dev',
    refName: process.env.VITE_BUILD_REF_NAME ?? 'local',
    time: process.env.VITE_BUILD_TIME ?? '',
  }

  return {
    base: command === 'build' ? '/easyink/' : '/',
    server: {
      port: 8532,
      host: '0.0.0.0',
    },
    resolve: {
      alias: { '@': resolve(__dirname, './src') },
    },
    plugins: [
      tailwindcss(),
      vue(),
      {
        name: 'easyink-build-meta',
        transformIndexHtml(html) {
          const metaTags = [
            `<meta name="easyink:build-sha" content="${escapeMetaContent(buildMeta.sha)}" />`,
            `<meta name="easyink:build-ref" content="${escapeMetaContent(buildMeta.refName)}" />`,
            `<meta name="easyink:build-time" content="${escapeMetaContent(buildMeta.time)}" />`,
          ].join('\n    ')

          return html.replace('<!-- inject:build-meta -->', metaTags)
        },
      },
    ],
  }
})
