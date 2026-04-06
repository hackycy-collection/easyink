<script setup lang="ts">
import { ref } from 'vue'
import { EasyInkDesigner } from '@easyink/designer'
import type { DocumentSchema } from '@easyink/schema'
import { simpleInvoiceTemplate } from '@easyink/samples'
import zhCN from '@easyink/designer/locale/zh-CN'
import { createLocalStoragePreferenceProvider } from '@easyink/designer'

import '@easyink/designer/index.css'

const schema = ref<DocumentSchema>(simpleInvoiceTemplate)
const preferenceProvider = createLocalStoragePreferenceProvider()
</script>

<template>
  <EasyInkDesigner
    v-model:schema="schema"
    :locale="zhCN"
    :preference-provider="preferenceProvider"
  />
</template>
