# API 索引

EasyInk 的公共 API 按包组织。以下是各包的主要导出。

## @easyink/designer

设计器组件和相关工具。

| 导出 | 类型 | 说明 |
|------|------|------|
| `EasyInkDesigner` | Vue Component | 设计器根组件 |
| `DesignerStore` | Class | 核心状态管理 |
| `provideDesignerStore` | Function | Vue provide 注入 store |
| `useDesignerStore` | Function | Vue inject 获取 store |
| `registerMaterialBundle` | Function | 注册物料包 |
| `ContributionRegistry` | Class | 贡献注册表 |
| `TemplateHistoryManager` | Class | 模板历史管理 |
| `createLocalStoragePreferenceProvider` | Function | localStorage 偏好持久化 |
| `tableSectionFilter` | Function | 表格属性面板过滤器 |

类型导出：`DocumentSchema`, `MaterialNode`, `DataSourceDescriptor`, `Contribution`, `ContributionContext`, `DesignerMaterialBundle`, `MaterialCapabilities`, `TemplateAutoSaveOptions`, `PreferenceProvider`

## @easyink/viewer

独立的预览/打印/导出引擎。

| 导出 | 类型 | 说明 |
|------|------|------|
| `createViewer` | Function | 创建 ViewerRuntime |
| `ViewerRuntime` | Class | 核心运行时 |
| `MaterialRendererRegistry` | Class | 物料渲染注册表 |
| `renderPages` | Function | 渲染页面 DOM |
| `createThumbnails` | Function | 生成缩略图 |
| `collectFontFamilies` | Function | 收集字体引用 |
| `loadAndInjectFonts` | Function | 加载并注入字体 |
| `projectBindings` | Function | 解析数据绑定 |
| `applyBindingsToProps` | Function | 应用绑定到属性 |
| `resolvePrintPolicy` | Function | 解析打印策略 |
| `createBrowserViewerHost` | Function | Browser Host |
| `createIframeViewerHost` | Function | Iframe Host |
| `createCustomViewerHost` | Function | Custom Host |

类型导出：`ViewerHost`, `ViewerOptions`, `ViewerOpenInput`, `ViewerRenderResult`, `ViewerDiagnosticEvent`, `PrintDriver`, `ViewerPrintPolicy`, `ViewerExporter`, `ViewerExportContext`

## @easyink/schema

文档 Schema 类型定义和工具。

| 导出 | 类型 | 说明 |
|------|------|------|
| `getNodeProps` | Function | 获取类型化的元素属性 |
| `isTableNode` | Function | 表格节点类型守卫 |
| `isTableDataNode` | Function | 数据表格节点类型守卫 |

类型导出：`DocumentSchema`, `PageSchema`, `MaterialNode`, `TableNode`, `TableSchema`, `BindingRef`, `AnimationSchema`

## @easyink/export-runtime

导出运行时框架。

| 导出 | 类型 | 说明 |
|------|------|------|
| `createExportRuntime` | Function | 创建 ExportRuntime |
| `ExportRuntime` | Class | 导出运行时 |

类型导出：`ExportFormatPlugin`, `ExportRuntimeContext`, `ExportDiagnostic`, `ExportProgress`

## @easyink/datasource

数据源管理。

类型导出：`DataSourceDescriptor`, `DataFieldNode`, `DataUnionBinding`, `DataSourceProviderFactory`, `DataSourceRegistry`
