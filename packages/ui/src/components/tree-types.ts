import type { Component } from 'vue'

export interface TreeNode {
  id: string
  label: string
  icon?: string | Component
  children?: TreeNode[]
  data?: unknown
}
