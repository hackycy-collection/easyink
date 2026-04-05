import type {
  BackgroundRepeat,
  BlankPolicy,
  BorderAppearance,
  BorderType,
  PageMode,
  PageScale,
  PrintBehavior,
  TableSectionKind,
  UnitType,
  UsageRule,
} from '@easyink/shared'

// ─── Document Schema ───────────────────────────────────────────────

export interface DocumentSchema {
  version: string
  meta?: DocumentMeta
  unit: UnitType
  page: PageSchema
  guides: GuideSchema
  elements: MaterialNode[]
  extensions?: Record<string, unknown>
  compat?: BenchmarkCompatState
}

export interface DocumentMeta {
  name?: string
  description?: string
  author?: string
  createdAt?: string
  updatedAt?: string
}

// ─── Guide Schema ──────────────────────────────────────────────────

export interface GuideSchema {
  x: number[]
  y: number[]
  groups?: GuideGroupSchema[]
}

export interface GuideGroupSchema {
  id: string
  x: number[]
  y: number[]
}

// ─── Compat State ──────────────────────────────────────────────────

export interface BenchmarkCompatState {
  rawGuideGroupKey?: string
  passthrough?: Record<string, unknown>
}

// ─── Page Schema ───────────────────────────────────────────────────

export interface PageSchema {
  mode: PageMode
  width: number
  height: number
  pages?: number
  scale?: PageScale
  radius?: string
  offsetX?: number
  offsetY?: number
  copies?: number
  blankPolicy?: BlankPolicy
  label?: LabelPageConfig
  grid?: GridConfig
  font?: string
  background?: PageBackground
  print?: PagePrintConfig
  extensions?: Record<string, unknown>
}

export interface LabelPageConfig {
  columns: number
  gap: number
}

export interface GridConfig {
  enabled: boolean
  width: number
  height: number
}

export interface PageBackground {
  color?: string
  image?: string
  repeat?: BackgroundRepeat
  width?: number
  height?: number
  offsetX?: number
  offsetY?: number
}

export interface PagePrintConfig {
  horizontalOffset?: number
  verticalOffset?: number
}

// ─── Material Node ─────────────────────────────────────────────────

export interface MaterialNode {
  id: string
  type: string
  name?: string
  unit?: UnitType
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  alpha?: number
  zIndex?: number
  hidden?: boolean
  locked?: boolean
  print?: PrintBehavior
  props: Record<string, unknown>
  binding?: BindingRef | BindingRef[]
  animations?: AnimationSchema[]
  children?: MaterialNode[]
  diagnostics?: NodeDiagnosticState[]
  extensions?: Record<string, unknown>
  compat?: BenchmarkElementCompatState
}

export interface BenchmarkElementCompatState {
  rawProps?: Record<string, unknown>
  rawBind?: unknown
  passthrough?: Record<string, unknown>
}

// ─── Binding ───────────────────────────────────────────────────────

export interface BindingRef {
  sourceId: string
  sourceName?: string
  sourceTag?: string
  fieldPath: string
  fieldKey?: string
  fieldLabel?: string
  usage?: UsageRule
  bindIndex?: number
  union?: UnionBinding[]
  required?: boolean
  extensions?: Record<string, unknown>
}

export interface UnionBinding {
  sourceId?: string
  sourceTag?: string
  fieldPath: string
  fieldKey?: string
  fieldLabel?: string
  use?: string
  offsetX?: number
  offsetY?: number
  defaultProps?: Record<string, unknown>
}

// ─── Animation ─────────────────────────────────────────────────────

export interface AnimationSchema {
  trigger: string
  type: string
  duration?: number
  delay?: number
  options?: Record<string, unknown>
}

// ─── Diagnostics ───────────────────────────────────────────────────

export interface NodeDiagnosticState {
  code: string
  severity: 'error' | 'warning' | 'info'
  message: string
}

// ─── Table Schema ──────────────────────────────────────────────────

export interface TableNode extends MaterialNode {
  type: 'table-static' | 'table-data' | 'table-flex'
  table: TableSchema
}

export interface TableSchema {
  layout: TableLayoutConfig
  sections: TableSectionSchema[]
  diagnostics?: LayoutDiagnostic[]
}

export interface TableLayoutConfig {
  equalizeCells?: boolean
  gap?: number
  borderAppearance?: BorderAppearance
  borderWidth?: number
  borderType?: BorderType
  borderColor?: string
}

export interface TableSectionSchema {
  kind: TableSectionKind
  repeatOnEachPage?: boolean
  hidden?: boolean
  rows: TableRowSchema[]
}

export interface TableRowSchema {
  height?: number
  cells: TableCellSchema[]
}

export interface TableCellSchema {
  rowSpan?: number
  colSpan?: number
  width: number
  height?: number
  border?: CellBorderSchema
  padding?: BoxSpacing
  props?: Record<string, unknown>
  binding?: BindingRef | BindingRef[]
  elements?: MaterialNode[]
}

export interface CellBorderSchema {
  top?: BorderSide
  right?: BorderSide
  bottom?: BorderSide
  left?: BorderSide
}

export interface BorderSide {
  width?: number
  color?: string
  type?: BorderType
}

export interface BoxSpacing {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

export interface LayoutDiagnostic {
  code: string
  severity: 'error' | 'warning' | 'info'
  message: string
  location?: { pageIndex?: number, rowIndex?: number }
}
