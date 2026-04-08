export interface TreeNode {
  id: string
  label: string
  icon?: string
  children?: TreeNode[]
  data?: unknown
}
