import type { SvgHeartProps } from './schema'
import { escapeHtml } from '@easyink/shared'

interface HeartRenderSize {
  width: number
  height: number
}

interface Point {
  x: number
  y: number
}

const VIEWBOX_SIZE = 100
const HEART_POINT_COUNT = 72
const DEFAULT_RENDER_SIZE: HeartRenderSize = {
  width: 100,
  height: 90,
}

export function buildSvgHeartMarkup(props: SvgHeartProps, size: HeartRenderSize = DEFAULT_RENDER_SIZE): string {
  const normalized = normalizeHeartProps(props)
  const outerPoints = buildHeartPoints(normalized)
  const outerPath = serializePath(outerPoints)
  const innerScale = getInnerScale(normalized.borderWidth, size)
  const innerPath = canRenderInnerHeart(innerScale)
    ? serializePath(scalePointsAroundCenter(outerPoints, innerScale))
    : null
  const hasContentFill = isVisibleFill(normalized.fillColor)

  const layers = normalized.borderWidth > 0 && innerPath
    ? [
        `<path d="${outerPath} ${innerPath}" fill="${escapeHtml(normalized.borderColor || 'transparent')}" fill-rule="evenodd" />`,
        ...(hasContentFill ? [`<path d="${innerPath}" fill="${escapeHtml(normalized.fillColor)}" />`] : []),
      ]
    : [`<path d="${outerPath}" fill="${escapeHtml(normalized.fillColor || 'transparent')}" />`]

  return `<svg viewBox="0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}" preserveAspectRatio="none" style="width:100%;height:100%;display:block;overflow:visible" xmlns="http://www.w3.org/2000/svg">${layers.join('')}</svg>`
}

function normalizeHeartProps(props: SvgHeartProps): SvgHeartProps {
  return {
    ...props,
    borderWidth: Math.max(0, props.borderWidth || 0),
    heartCleftDepth: clamp(props.heartCleftDepth || 18, 6, 34),
    heartShoulderWidth: clamp(props.heartShoulderWidth || 18, 10, 30),
  }
}

function getInnerScale(borderWidth: number, size: HeartRenderSize): Point {
  return {
    x: clamp((size.width - borderWidth * 2) / Math.max(size.width, Number.EPSILON), 0, 1),
    y: clamp((size.height - borderWidth * 2) / Math.max(size.height, Number.EPSILON), 0, 1),
  }
}

function canRenderInnerHeart(scale: Point): boolean {
  return scale.x > 0 && scale.y > 0
}

function isVisibleFill(fillColor: string | undefined): boolean {
  return !!fillColor && fillColor !== 'transparent'
}

function buildHeartPoints(props: SvgHeartProps): Point[] {
  const basePoints: Point[] = []
  const shoulderScale = mapRange(props.heartShoulderWidth, 10, 30, 0.88, 1.12)
  const cleftScale = mapRange(props.heartCleftDepth, 6, 34, 0.72, 1.28)

  for (let index = 0; index < HEART_POINT_COUNT; index += 1) {
    const theta = (Math.PI * 2 * index) / HEART_POINT_COUNT
    const rawX = 16 * Math.sin(theta) ** 3
    const rawY = 13 * Math.cos(theta) - 5 * Math.cos(2 * theta) - 2 * Math.cos(3 * theta) - Math.cos(4 * theta)
    const topBias = rawY > 0 ? cleftScale : 1

    basePoints.push({
      x: rawX * shoulderScale,
      y: rawY * topBias,
    })
  }

  return normalizePoints(basePoints)
}

function normalizePoints(points: Point[]): Point[] {
  const bounds = getPointBounds(points)
  return points.map(point => ({
    x: ((point.x - bounds.minX) / Math.max(bounds.maxX - bounds.minX, Number.EPSILON)) * VIEWBOX_SIZE,
    y: ((bounds.maxY - point.y) / Math.max(bounds.maxY - bounds.minY, Number.EPSILON)) * VIEWBOX_SIZE,
  }))
}

function scalePointsAroundCenter(points: Point[], scale: Point): Point[] {
  return points.map(point => ({
    x: 50 + (point.x - 50) * scale.x,
    y: 50 + (point.y - 50) * scale.y,
  }))
}

function serializePath(points: Point[]): string {
  if (points.length === 0)
    return ''

  const commands = [`M ${round(points[0].x)} ${round(points[0].y)}`]
  for (let index = 1; index < points.length; index += 1)
    commands.push(`L ${round(points[index].x)} ${round(points[index].y)}`)
  commands.push('Z')
  return commands.join(' ')
}

function getPointBounds(points: Point[]): { minX: number, minY: number, maxX: number, maxY: number } {
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function mapRange(value: number, inputMin: number, inputMax: number, outputMin: number, outputMax: number): number {
  const ratio = (value - inputMin) / Math.max(inputMax - inputMin, Number.EPSILON)
  return outputMin + ratio * (outputMax - outputMin)
}

function round(value: number): string {
  return value.toFixed(2).replace(/\.00$/, '')
}
