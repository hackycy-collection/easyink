import type { App } from 'vue'
import DefaultTheme from 'vitepress/theme'
import JsonToDatasource from './components/JsonToDatasource.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: { app: App }) {
    app.component('JsonToDatasource', JsonToDatasource)
  },
}
