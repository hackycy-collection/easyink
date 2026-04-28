import Antd from 'ant-design-vue'
import { createApp } from 'vue'
import App from './App.vue'

import '@easyink/designer/index.css'
import '@easyink/ai/index.css'
import 'ant-design-vue/dist/reset.css'

import './style.css'

createApp(App).use(Antd).mount('#app')
