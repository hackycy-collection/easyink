import type { TextProps } from './schema'

export function resolveTextWritingMode(props: Pick<TextProps, 'writingMode'>): TextProps['writingMode'] {
  return props.writingMode ?? 'horizontal'
}

export function resolveTextOverflow(props: Pick<TextProps, 'overflow' | 'writingMode'>): TextProps['overflow'] {
  const writingMode = resolveTextWritingMode(props)
  if (writingMode === 'vertical' && props.overflow === 'ellipsis')
    return 'hidden'
  return props.overflow
}

export function getTextContainerStyles(props: Pick<TextProps, 'backgroundColor' | 'borderWidth' | 'borderType' | 'borderColor' | 'verticalAlign' | 'writingMode'>, unit: string) {
  const writingMode = resolveTextWritingMode(props)
  const verticalAlign = writingMode === 'vertical'
    ? ({ top: 'flex-end', middle: 'center', bottom: 'flex-start' } as const)[props.verticalAlign]
    : ({ top: 'flex-start', middle: 'center', bottom: 'flex-end' } as const)[props.verticalAlign]
  const borderStyle = props.borderType === 'solid' ? 'solid' : ({ dashed: 'dashed', dotted: 'dotted' } as const)[props.borderType]

  return [
    'width:100%;height:100%',
    'display:flex',
    writingMode === 'vertical' ? `justify-content:${verticalAlign}` : `align-items:${verticalAlign}`,
    'box-sizing:border-box',
    'overflow:hidden',
    props.backgroundColor ? `background:${props.backgroundColor}` : '',
    props.borderWidth ? `border:${props.borderWidth}${unit} ${borderStyle} ${props.borderColor}` : '',
  ].filter(Boolean)
}

export function getTextContentStyles(props: Pick<TextProps, 'fontSize' | 'fontFamily' | 'fontWeight' | 'fontStyle' | 'color' | 'lineHeight' | 'letterSpacing' | 'autoWrap' | 'overflow' | 'textAlign' | 'writingMode'>, unit: string) {
  const writingMode = resolveTextWritingMode(props)
  const overflow = resolveTextOverflow(props)
  const textAlign = writingMode === 'vertical'
    ? ({ left: 'start', center: 'center', right: 'end' } as const)[props.textAlign]
    : props.textAlign

  return [
    writingMode === 'vertical' ? 'height:100%' : 'width:100%',
    writingMode === 'vertical' ? 'writing-mode:vertical-rl' : '',
    writingMode === 'vertical' ? 'text-orientation:mixed' : '',
    `text-align:${textAlign}`,
    `font-size:${props.fontSize}${unit}`,
    props.fontFamily ? `font-family:${props.fontFamily}` : '',
    `font-weight:${props.fontWeight}`,
    `font-style:${props.fontStyle}`,
    `color:${props.color}`,
    `line-height:${props.lineHeight}`,
    props.letterSpacing ? `letter-spacing:${props.letterSpacing}${unit}` : '',
    ...getWrapStyles(props),
    overflow === 'ellipsis' ? 'text-overflow:ellipsis' : '',
  ].filter(Boolean)
}

function getWrapStyles(props: Pick<TextProps, 'autoWrap' | 'writingMode'>): string[] {
  const writingMode = resolveTextWritingMode(props)
  if (writingMode === 'vertical') {
    return props.autoWrap
      ? ['word-break:break-word']
      : ['word-break:normal', 'overflow-wrap:normal']
  }

  return props.autoWrap
    ? ['word-break:break-word']
    : ['white-space:nowrap']
}
