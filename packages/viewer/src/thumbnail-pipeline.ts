import type { ThumbnailResult, ViewerPageResult } from './types'
import { escapeHtml } from '@easyink/shared'

export function createThumbnails(pages: ViewerPageResult[], unit: string): ThumbnailResult[] {
  return pages.map(page => ({
    pageIndex: page.index,
    dataUrl: createPageThumbnailDataUrl(page, unit),
  }))
}

function createPageThumbnailDataUrl(page: ViewerPageResult, unit: string): string {
  const width = Math.max(page.width, 1)
  const height = Math.max(page.height, 1)
  const html = page.element?.outerHTML ?? ''
  const content = html
    ? `<foreignObject width="${width}" height="${height}">${html}</foreignObject>`
    : `<rect x="0" y="0" width="${width}" height="${height}" fill="white"/><text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-size="8" fill="#777">${page.index + 1}</text>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}${escapeHtml(unit)}" height="${height}${escapeHtml(unit)}" viewBox="0 0 ${width} ${height}">${content}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
