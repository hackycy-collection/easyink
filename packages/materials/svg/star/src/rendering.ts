import type { Point, Rect } from '@easyink/core'
import type { MaterialNode } from '@easyink/schema'
import type { SvgStarControlSelection, SvgStarProps } from './schema'
import { escapeHtml } from '@easyink/shared'

const VIEWBOX_SIZE = 100
const STAR_CENTER = 50
const STAR_OUTER_RADIUS = 50
const STAR_HANDLE_SIZE = 6

interface PointBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface StarEditGuide {
  center: Point
  handle: Point
  radiusX: number
  radiusY: number
}

export function buildStarSvgMarkup(props: SvgStarProps, unit = 'mm'): string {
  const normalized = normalizeStarProps(props)
  const points = normalizePointsToViewBox(getRawStarPolygonPoints(normalized))
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block;overflow:visible" xmlns="http://www.w3.org/2000/svg">`
    + `<polygon points="${serializePoints(points)}" ${getPaintAttrs(normalized, unit)} />`
    + `</svg>`
}

export function getStarControlRect(node: MaterialNode, props: SvgStarProps, selection: SvgStarControlSelection): Rect {
  const localPoint = getStarControlLocalPoint(node, props, selection.handle)
  const documentPoint = localToDocumentPoint(node, localPoint)
  return {
    x: documentPoint.x - STAR_HANDLE_SIZE / 2,
    y: documentPoint.y - STAR_HANDLE_SIZE / 2,
    width: STAR_HANDLE_SIZE,
    height: STAR_HANDLE_SIZE,
  }
}

export function resolveStarControl(localPoint: Point, node: MaterialNode, props: SvgStarProps): SvgStarControlSelection | null {
  if (!isPointInsideNode(localPoint, node))
    return null

  const innerHandle = getStarControlLocalPoint(node, props, 'inner-radius')
  const threshold = Math.max(5, Math.min(node.width, node.height) * 0.06)

  const innerDistance = distance(localPoint, innerHandle)

  if (innerDistance <= threshold)
    return { handle: 'inner-radius' }

  return null
}

export function updateStarControlFromLocalPoint(node: MaterialNode, props: SvgStarProps, handle: SvgStarControlSelection['handle'], localPoint: Point): Partial<SvgStarProps> {
  const normalizedProps = normalizeStarProps(props)
  const bounds = getStarPointBounds(getRawStarPolygonPoints(normalizedProps))
  const normalizedPoint = localToNormalizedPoint(node, localPoint)
  const rawPoint = denormalizePointFromViewBox(normalizedPoint, bounds)

  return {
    starInnerRatio: clamp(distance(rawPoint, { x: STAR_CENTER, y: STAR_CENTER }) / STAR_OUTER_RADIUS, 0.08, 0.95),
  }
}

export function getStarEditGuide(props: SvgStarProps): StarEditGuide {
  const normalizedProps = normalizeStarProps(props)
  const bounds = getStarPointBounds(getRawStarPolygonPoints(normalizedProps))
  const rawCenter = { x: STAR_CENTER, y: STAR_CENTER }
  const rawRadius = STAR_OUTER_RADIUS * clamp(normalizedProps.starInnerRatio, 0.08, 0.95)

  return {
    center: normalizePointToViewBox(rawCenter, bounds),
    handle: normalizePointToViewBox({ x: STAR_CENTER + rawRadius, y: STAR_CENTER }, bounds),
    radiusX: rawRadius * getScaleForAxis(bounds.maxX - bounds.minX),
    radiusY: rawRadius * getScaleForAxis(bounds.maxY - bounds.minY),
  }
}

export function getStarHandleRects(node: MaterialNode, props: SvgStarProps): Record<SvgStarControlSelection['handle'], Rect> {
  return {
    'inner-radius': getStarControlRect(node, props, { handle: 'inner-radius' }),
  }
}

function getRawStarPolygonPoints(props: SvgStarProps): Point[] {
  const points: Point[] = []
  const pointCount = clamp(Math.round(props.starPoints), 3, 24)
  const innerRadius = STAR_OUTER_RADIUS * clamp(props.starInnerRatio, 0.08, 0.95)

  for (let index = 0; index < pointCount * 2; index += 1) {
    const radius = index % 2 === 0 ? STAR_OUTER_RADIUS : innerRadius
    const angle = degreesToRadians(props.starRotation + (index * 180) / pointCount)
    const x = STAR_CENTER + Math.cos(angle) * radius
    const y = STAR_CENTER + Math.sin(angle) * radius
    points.push({ x, y })
  }

  return points
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

function getStarControlNormalizedPoint(props: SvgStarProps, _handle: SvgStarControlSelection['handle']): Point {
  return getStarEditGuide(props).handle
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
    starInnerRatio: clamp(props.starInnerRatio || 0.381966, 0.08, 0.95),
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

function getStarPointBounds(points: Point[]): PointBounds {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  return { minX, minY, maxX, maxY }
}

function normalizePointsToViewBox(points: Point[]): Point[] {
  const bounds = getStarPointBounds(points)
  return points.map(point => normalizePointToViewBox(point, bounds))
}

function normalizePointToViewBox(point: Point, bounds: PointBounds): Point {
  return {
    x: ((point.x - bounds.minX) / Math.max(bounds.maxX - bounds.minX, Number.EPSILON)) * VIEWBOX_SIZE,
    y: ((point.y - bounds.minY) / Math.max(bounds.maxY - bounds.minY, Number.EPSILON)) * VIEWBOX_SIZE,
  }
}

function denormalizePointFromViewBox(point: Point, bounds: PointBounds): Point {
  return {
    x: bounds.minX + (point.x / VIEWBOX_SIZE) * Math.max(bounds.maxX - bounds.minX, Number.EPSILON),
    y: bounds.minY + (point.y / VIEWBOX_SIZE) * Math.max(bounds.maxY - bounds.minY, Number.EPSILON),
  }
}

function getScaleForAxis(span: number): number {
  return VIEWBOX_SIZE / Math.max(span, Number.EPSILON)
}

function serializePoints(points: Point[]): string {
  return points.map(point => `${roundPoint(point.x)},${roundPoint(point.y)}`).join(' ')
}

function roundPoint(value: number): string {
  return value.toFixed(2).replace(/\.00$/, '')
}
