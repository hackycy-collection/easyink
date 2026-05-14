import { escapeHtml } from '@easyink/shared'

const SVG_NS = 'http://www.w3.org/2000/svg'
const ELEMENT_NODE = 1
const TEXT_NODE = 3
const CDATA_SECTION_NODE = 4

const ALLOWED_ELEMENTS = new Set([
  'svg',
  'g',
  'defs',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'textpath',
  'image',
  'lineargradient',
  'radialgradient',
  'stop',
  'clippath',
  'mask',
  'pattern',
  'marker',
  'symbol',
  'use',
  'title',
  'desc',
])

const GLOBAL_ATTRIBUTES = new Set([
  'id',
  'class',
  'transform',
  'opacity',
  'fill',
  'fill-opacity',
  'fill-rule',
  'clip-rule',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'vector-effect',
  'clip-path',
  'mask',
  'filter',
  'marker-start',
  'marker-mid',
  'marker-end',
  'role',
  'aria-label',
])

const ELEMENT_ATTRIBUTES: Record<string, Set<string>> = {
  svg: new Set(['x', 'y', 'width', 'height', 'viewbox', 'preserveaspectratio']),
  path: new Set(['d', 'pathlength']),
  rect: new Set(['x', 'y', 'width', 'height', 'rx', 'ry']),
  circle: new Set(['cx', 'cy', 'r']),
  ellipse: new Set(['cx', 'cy', 'rx', 'ry']),
  line: new Set(['x1', 'y1', 'x2', 'y2']),
  polyline: new Set(['points']),
  polygon: new Set(['points']),
  text: new Set(['x', 'y', 'dx', 'dy', 'rotate', 'textlength', 'lengthadjust', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'alignment-baseline', 'letter-spacing']),
  tspan: new Set(['x', 'y', 'dx', 'dy', 'rotate', 'textlength', 'lengthadjust', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'alignment-baseline', 'letter-spacing']),
  textpath: new Set(['href', 'xlink:href', 'startoffset', 'method', 'spacing']),
  image: new Set(['x', 'y', 'width', 'height', 'href', 'xlink:href', 'preserveaspectratio', 'crossorigin']),
  lineargradient: new Set(['x1', 'y1', 'x2', 'y2', 'gradientunits', 'gradienttransform', 'spreadmethod', 'href', 'xlink:href']),
  radialgradient: new Set(['cx', 'cy', 'r', 'fx', 'fy', 'fr', 'gradientunits', 'gradienttransform', 'spreadmethod', 'href', 'xlink:href']),
  stop: new Set(['offset', 'stop-color', 'stop-opacity']),
  clippath: new Set(['id', 'clippathunits']),
  mask: new Set(['id', 'x', 'y', 'width', 'height', 'maskunits', 'maskcontentunits']),
  pattern: new Set(['id', 'x', 'y', 'width', 'height', 'patternunits', 'patterncontentunits', 'patterntransform', 'viewbox', 'preserveaspectratio', 'href', 'xlink:href']),
  marker: new Set(['id', 'viewbox', 'preserveaspectratio', 'refx', 'refy', 'markerwidth', 'markerheight', 'markerunits', 'orient']),
  symbol: new Set(['id', 'viewbox', 'preserveaspectratio']),
  use: new Set(['x', 'y', 'width', 'height', 'href', 'xlink:href']),
}

const HREF_ATTRIBUTES = new Set(['href', 'xlink:href'])
const PAINT_URL_ATTRIBUTES = new Set(['fill', 'stroke', 'clip-path', 'mask', 'filter', 'marker-start', 'marker-mid', 'marker-end'])

export function sanitizeSvgContent(content: string): string {
  if (!content)
    return ''

  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined')
    return escapeHtml(content)

  const parser = new DOMParser()
  const sourceDocument = parser.parseFromString(`<svg xmlns="${SVG_NS}">${content}</svg>`, 'image/svg+xml')

  if (sourceDocument.getElementsByTagName('parsererror').length > 0)
    return escapeHtml(content)

  const outputDocument = sourceDocument.implementation.createDocument(SVG_NS, 'svg', null)
  const outputRoot = outputDocument.documentElement
  for (const child of Array.from(outputRoot.childNodes)) {
    outputRoot.removeChild(child)
  }

  for (const child of Array.from(sourceDocument.documentElement.childNodes)) {
    if (isParserArtifact(child))
      continue
    const sanitized = sanitizeNode(child, outputDocument)
    if (sanitized)
      outputRoot.appendChild(sanitized)
  }

  const serializer = new XMLSerializer()
  return Array.from(outputRoot.childNodes)
    .filter(child => !isParserArtifact(child))
    .map(child => serializer.serializeToString(child))
    .join('')
}

function isParserArtifact(node: Node): boolean {
  if (node.nodeType !== ELEMENT_NODE)
    return false
  const element = node as Element
  return element.namespaceURI === 'http://www.w3.org/1999/xhtml' && (element.localName === 'head' || element.localName === 'body')
}

function sanitizeNode(node: Node, outputDocument: XMLDocument): Node | null {
  if (node.nodeType === TEXT_NODE || node.nodeType === CDATA_SECTION_NODE)
    return outputDocument.createTextNode(node.textContent ?? '')

  if (node.nodeType !== ELEMENT_NODE)
    return null

  const source = node as Element
  const tag = source.localName.toLowerCase()
  if (!ALLOWED_ELEMENTS.has(tag))
    return null

  const target = outputDocument.createElementNS(SVG_NS, source.localName)
  for (const attr of Array.from(source.attributes)) {
    if (isAllowedAttribute(tag, attr))
      target.setAttribute(attr.name, attr.value)
  }

  for (const child of Array.from(source.childNodes)) {
    const sanitized = sanitizeNode(child, outputDocument)
    if (sanitized)
      target.appendChild(sanitized)
  }

  return target
}

function isAllowedAttribute(tag: string, attr: Attr): boolean {
  const name = attr.name.toLowerCase()
  if (name.startsWith('on') || name === 'style')
    return false

  const allowedForElement = ELEMENT_ATTRIBUTES[tag]
  if (!GLOBAL_ATTRIBUTES.has(name) && !allowedForElement?.has(name))
    return false

  if (HREF_ATTRIBUTES.has(name))
    return isAllowedHref(tag, attr.value)

  if (PAINT_URL_ATTRIBUTES.has(name) && attr.value.toLowerCase().includes('url('))
    return isInternalUrlReference(attr.value)

  return !hasDangerousProtocol(attr.value)
}

function isAllowedHref(tag: string, value: string): boolean {
  const trimmed = value.trim()
  if (isInternalFragment(trimmed))
    return true

  if (tag !== 'image')
    return false

  try {
    const url = new URL(trimmed, 'https://easyink.local')
    return url.protocol === 'http:' || url.protocol === 'https:'
  }
  catch {
    return false
  }
}

function isInternalFragment(value: string): boolean {
  return /^#[a-z][\w:.-]*$/i.test(value)
}

function isInternalUrlReference(value: string): boolean {
  return /^url\(\s*#[a-z][\w:.-]*\s*\)(?:\s+[#\w(),.%+-]+)?$/i.test(value.trim())
}

function hasDangerousProtocol(value: string): boolean {
  let normalized = ''
  for (const char of value) {
    const code = char.charCodeAt(0)
    if (code <= 0x20 || code === 0x7F)
      continue
    normalized += char.toLowerCase()
  }
  return normalized.includes('javascript:') || normalized.includes('vbscript:') || normalized.includes('data:text/html')
}
