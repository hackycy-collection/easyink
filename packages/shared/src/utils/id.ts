let counter = 0

/**
 * 生成全局唯一 ID
 * 使用时间戳 + 随机数 + 计数器确保唯一性
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  const count = (counter++).toString(36)
  return `${timestamp}${random}${count}`
}
