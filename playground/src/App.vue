<script setup lang="ts">
import { ref } from 'vue'
import { EasyInkDesigner } from '@easyink/designer'
import type { DocumentSchema } from '@easyink/schema'
import { simpleInvoiceTemplate } from '@easyink/samples'
import zhCN from '@easyink/designer/locale/zh-CN'
import '@easyink/designer/index.css'

const schema = ref<DocumentSchema>(simpleInvoiceTemplate)
</script>

<template>
  <EasyInkDesigner
    v-model:schema="schema"
    :locale="zhCN"
  />
</template>
