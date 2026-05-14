import type { Point, Rect } from '@easyink/core'
import type { MaterialNode } from '@easyink/schema'
import type { SvgStarControlSelection, SvgStarProps } from './schema'
import { escapeHtml } from '@easyink/shared'

const VIEWBOX_SIZE = 100
const STAR_CENTER = 50
const STAR_OUTER_RADIUS = 44
const ROTATION_HANDLE_OFFSET = 14

export function buildStarSvgMarkup(props: SvgStarProps, unit = 'mm'): string {
  const normalized = normalizeStarProps(props)
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block;overflow:visible" xmlns="http://www.w3.org/2000/svg">`
    + `<polygon points="${getStarPolygonPoints(normalized)}" ${getPaintAttrs(normalized, unit)} />`
    + `</svg>`
}

export function getStarControlRect(node: MaterialNode, props: SvgStarProps, selection: SvgStarControlSelection): Rect {
  const localPoint = getStarControlLocalPoint(node, props, selection.handle)
  const documentPoint = localToDocumentPoint(node, localPoint)
  return {
    x: documentPoint.x - 4,
    y: documentPoint.y - 4,
    width: 8,
    height: 8,
  }
}

export function resolveStarControl(localPoint: Point, node: MaterialNode, props: SvgStarProps): SvgStarControlSelection | null {
  if (!isPointInsideNode(localPoint, node))
    return null

  const innerHandle = getStarControlLocalPoint(node, props, 'inner-radius')
  const rotationHandle = getStarControlLocalPoint(node, props, 'rotation')
  const threshold = Math.max(6, Math.min(node.width, node.height) * 0.08)

  const innerDistance = distance(localPoint, innerHandle)
  const rotationDistance = distance(localPoint, rotationHandle)

  if (innerDistance <= threshold || innerDistance <= rotationDistance)
    return { handle: 'inner-radius' }

  if (rotationDistance <= threshold)
    return { handle: 'rotation' }

  return { handle: 'inner-radius' }
}

export function updateStarControlFromLocalPoint(node: MaterialNode, props: SvgStarProps, handle: SvgStarControlSelection['handle'], localPoint: Point): Partial<SvgStarProps> {
  const normalizedPoint = localToNormalizedPoint(node, localPoint)

  if (handle === 'rotation') {
    return {
      starRotation: normalizeDegrees(Math.atan2(normalizedPoint.y - STAR_CENTER, normalizedPoint.x - STAR_CENTER) * 180 / Math.PI),
    }
  }

  return {
    starInnerRatio: clamp(distance(normalizedPoint, { x: STAR_CENTER, y: STAR_CENTER }) / STAR_OUTER_RADIUS, 0.08, 0.95),
  }
}

export function getStarHandleRects(node: MaterialNode, props: SvgStarProps): Record<SvgStarControlSelection['handle'], Rect> {
  return {
    'inner-radius': getStarControlRect(node, props, { handle: 'inner-radius' }),
    'rotation': getStarControlRect(node, props, { handle: 'rotation' }),
  }
}

function getStarPolygonPoints(props: SvgStarProps): string {
  const points: string[] = []
  const pointCount = clamp(Math.round(props.starPoints), 3, 24)
  const innerRadius = STAR_OUTER_RADIUS * clamp(props.starInnerRatio, 0.08, 0.95)

  for (let index = 0; index < pointCount * 2; index += 1) {
    const radius = index % 2 === 0 ? STAR_OUTER_RADIUS : innerRadius
    const angle = degreesToRadians(props.starRotation + (index * 180) / pointCount)
    const x = STAR_CENTER + Math.cos(angle) * radius
    const y = STAR_CENTER + Math.sin(angle) * radius
    points.push(`${roundPoint(x)},${roundPoint(y)}`)
  }

  return points.join(' ')
}

function getPaintAttrs(props: SvgStarProps, unit: string): string {
  const borderWidth = Math.max(0, props.borderWidth || 0)
  return [
    `fill="${escapeHtml(props.fillColor || 'transparent')}"`,
    `stroke="${escapeHtml(borderWidth > 0 ? props.borderColor : 'transparent')}"`,
    `stroke-width="${borderWidth}${unit}"`,
    'vector-effect="non-scaling-stroke"',
  ].join(' ')
}

function getStarControlLocalPoint(node: MaterialNode, props: SvgStarProps, handle: SvgStarControlSelection['handle']): Point {
  const normalized = getStarControlNormalizedPoint(props, handle)
  return normalizedToLocalPoint(node, normalized)
}

function getStarControlNormalizedPoint(props: SvgStarProps, handle: SvgStarControlSelection['handle']): Point {
  if (handle === 'rotation') {
    const angle = degreesToRadians(props.starRotation)
    return {
      x: STAR_CENTER + Math.cos(angle) * (STAR_OUTER_RADIUS + ROTATION_HANDLE_OFFSET),
      y: STAR_CENTER + Math.sin(angle) * (STAR_OUTER_RADIUS + ROTATION_HANDLE_OFFSET),
    }
  }

  const angle = degreesToRadians(props.starRotation + 180 / clamp(Math.round(props.starPoints), 3, 24))
  const radius = STAR_OUTER_RADIUS * clamp(props.starInnerRatio, 0.08, 0.95)
  return {
    x: STAR_CENTER + Math.cos(angle) * radius,
    y: STAR_CENTER + Math.sin(angle) * radius,
  }
}

function normalizedToLocalPoint(node: MaterialNode, point: Point): Point {
  return {
    x: (point.x / VIEWBOX_SIZE) * node.width,
    y: (point.y / VIEWBOX_SIZE) * node.height,
  }
}

function localToNormalizedPoint(node: MaterialNode, point: Point): Point {
  return {
    x: (point.x / Math.max(node.width, Number.EPSILON)) * VIEWBOX_SIZE,
    y: (point.y / Math.max(node.height, Number.EPSILON)) * VIEWBOX_SIZE,
  }
}

function localToDocumentPoint(node: MaterialNode, point: Point): Point {
  const scaleX = (node as MaterialNode & { scaleX?: number }).scaleX ?? 1
  const scaleY = (node as MaterialNode & { scaleY?: number }).scaleY ?? 1
  const radians = degreesToRadians(node.rotation ?? 0)
  const center = { x: node.x + node.width / 2, y: node.y + node.height / 2 }
  const scaled = {
    x: (point.x - node.width / 2) * scaleX,
    y: (point.y - node.height / 2) * scaleY,
  }
  return {
    x: center.x + scaled.x * Math.cos(radians) - scaled.y * Math.sin(radians),
    y: center.y + scaled.x * Math.sin(radians) + scaled.y * Math.cos(radians),
  }
}

function normalizeStarProps(props: SvgStarProps): SvgStarProps {
  return {
    ...props,
    starPoints: clamp(Math.round(props.starPoints || 5), 3, 24),
    starInnerRatio: clamp(props.starInnerRatio || 0.48, 0.08, 0.95),
    starRotation: normalizeDegrees(props.starRotation ?? -90),
  }
}

function isPointInsideNode(point: Point, node: MaterialNode): boolean {
  return point.x >= 0 && point.y >= 0 && point.x <= node.width && point.y <= node.height
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180
}

function normalizeDegrees(value: number): number {
  let normalized = value
  while (normalized > 180)
    normalized -= 360
  while (normalized <= -180)
    normalized += 360
  return normalized
}

function roundPoint(value: number): string {
  return value.toFixed(2).replace(/\.00$/, '')
}
