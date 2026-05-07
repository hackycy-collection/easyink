export interface ViewerHostAdapter {
  readonly kind: 'browser' | 'iframe' | 'custom'
  readonly document: Document
  readonly window?: Window
  readonly mount: HTMLElement
  clear: () => void
  appendStyle: (css: string) => () => void
  print: () => void
}

export function createBrowserViewerHost(container: HTMLElement): ViewerHostAdapter {
  const doc = container.ownerDocument
  return createElementHost({
    kind: 'browser',
    document: doc,
    window: doc.defaultView ?? (typeof window === 'undefined' ? undefined : window),
    mount: container,
  })
}

export function createIframeViewerHost(iframe: HTMLIFrameElement): ViewerHostAdapter {
  const doc = iframe.contentDocument
  if (!doc) {
    throw new Error('Viewer iframe document is not available')
  }
  const frameWindow = iframe.contentWindow ?? doc.defaultView ?? undefined
  if (!doc.body) {
    doc.documentElement.appendChild(doc.createElement('body'))
  }
  let mount = doc.getElementById('easyink-viewer-root') as HTMLElement | null
  if (!mount) {
    mount = doc.createElement('div')
    mount.id = 'easyink-viewer-root'
    doc.body.appendChild(mount)
  }
  return createElementHost({
    kind: 'iframe',
    document: doc,
    window: frameWindow,
    mount,
  })
}

export function createCustomViewerHost(options: {
  document: Document
  window?: Window
  mount: HTMLElement
  kind?: 'custom'
  print?: () => void
}): ViewerHostAdapter {
  const host = createElementHost({
    kind: options.kind ?? 'custom',
    document: options.document,
    window: options.window,
    mount: options.mount,
  })
  if (!options.print)
    return host
  return {
    ...host,
    print: options.print,
  }
}

function createElementHost(options: {
  kind: ViewerHostAdapter['kind']
  document: Document
  window?: Window
  mount: HTMLElement
}): ViewerHostAdapter {
  return {
    kind: options.kind,
    document: options.document,
    window: options.window,
    mount: options.mount,
    clear() {
      options.mount.replaceChildren()
    },
    appendStyle(css: string) {
      const style = options.document.createElement('style')
      style.textContent = css
      options.document.head.appendChild(style)
      return () => style.remove()
    },
    print() {
      if (!options.window?.print)
        throw new Error('Viewer host does not provide window.print')
      options.window.print()
    },
  }
}
