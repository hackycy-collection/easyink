# 22. 关键设计决策记录

以下决策基于对标产品实测和本轮架构重构后的统一结论。若其他旧文档仍残留冲突表述，以本页为准。

| # | 决策主题 | 结论 | 理由 |
|---|----------|------|------|
| 1 | 产品定位 | 通用文档/报表设计器框架 | 目标不是极简打印模板器，而是完整工作台式设计器 |
| 2 | 架构输入 | 以对标产品实测为主 | 避免文档脱离真实复刻目标 |
| 3 | Designer 与 Viewer 关系 | 明确拆分 | 设计器负责编辑，Viewer 负责真实预览、打印、导出 |
| 4 | Viewer 承载形态 | 独立运行时，可被 iframe 宿主复用 | 保证预览路径与独立消费路径一致 |
| 5 | Schema 定位 | 文档持久化模型 | 同时服务 Designer 编辑和 Viewer 回放 |
| 6 | 顶层文档结构 | `unit + page + guides + elements` | 对齐目标产品的文档模型与编辑需求 |
| 7 | 页面模式 | `fixed / stack / label` | 覆盖固定分页、连续纸和标签纸三类主场景 |
| 8 | 数据源系统 | 独立成层，不归属 Designer 私有逻辑 | Designer 和 Viewer 都需要共享协议 |
| 9 | 数据源元数据 | 支持 `tag/use/props/union/bindIndex/headless` | 字段树不仅是展示，还要驱动物料推荐和批量投放 |
| 10 | 模板动态能力 | 不支持模板内任意脚本 | 控制复杂度和安全边界 |
| 11 | 格式规则 | 仅允许安全声明式 `usage` | 满足常见格式化，不引入表达式引擎 |
| 12 | table-data 定位 | 一级系统 | 它有独立分页、绑定和交互复杂度 |
| 13 | container/chart/svg/relation | 一级物料类别 | 结构性物料不能退化为普通文本框思维 |
| 14 | 模板库 | 一级产品能力 | 不只是 demo 集合，而是 Designer 的覆盖式工作台能力 |
| 15 | 工作台布局 | 顶层双栏 + 画布内窗口系统 | 真实交互更接近桌面式浮动窗口，不是固定左中右三栏 |
| 16 | 工作台状态 | 独立于模板状态 | 面板显隐和布局不应污染 Schema |
| 17 | 撤销/重做边界 | 只覆盖文档编辑 | 工作台编排不进入命令栈 |
| 18 | 预览策略 | 真实预览由 Viewer 执行 | 设计画布不承担完整分页语义 |
| 19 | 设计器数据预览 | 允许调试数据驱动 Viewer 预览 | 但不把运行时 DOM 伪装成设计器画布结果 |
| 20 | 物料包策略 | 内置物料优先，第三方扩展后置 | 先稳定核心复刻路径 |
| 21 | 扩展机制 | 当前仅内部抽象 | 先验证稳定性，再公开最小扩展面 |
| 22 | 未知物料处理 | 占位保留 + 诊断 | 保护模板资产，避免静默丢失 |
| 23 | 资源治理 | 仅保存引用 | 图片、字体、背景资源的上传缓存交给宿主 |
| 24 | 诊断策略 | 非阻断诊断为主 | 先尽量打开和预览，再暴露问题 |
| 25 | Monorepo 主轴 | `schema / core / datasource / viewer / designer / materials` | 包结构必须服务新产品模型，而不是旧的 renderer 中心模型 |
| 26 | 对外最小消费面 | `designer` 与 `viewer` | 宿主要么用工作台，要么用独立预览运行时 |
| 27 | 顶部工具条 | 双层建模且第二层可配置 | 第二层是工具组带，不是写死的一排命令按钮 |
| 28 | 窗口系统 | 画布内浮动窗口 | 数据源、结构树、属性、历史、动画等都应作为窗口对象建模 |
| 29 | 状态栏 | 独立工作台层 | 焦点、网络、暂存和自动保存不应混入普通面板 |
| 30 | 文档更新原则 | 统一替换旧前提，不做局部缝补 | 否则会残留“极简打印模板”错误心智 |
| 31 | Schema 双视图 | 内部规范模型与 benchmark 兼容输入分离 | 既要兼容对标产品，又不能把历史噪音扩散到内部 API |
| 32 | 页面模型深度 | 页面字段完整覆盖打印、标签和背景语义 | `width/height` 级别抽象不足以支撑真实复刻 |
| 33 | 属性窗口 | 元素属性和页面属性共用一个窗口壳层 | 这是真实交互模型，拆成两个系统会偏离产品体验 |
| 34 | 物料目录 | `chart/svg/relation/data` 都按目录系统建模 | 它们不是单个物料，而是一组可注册子物料 |
| 35 | 数据字段协议 | 保留 `title/id/tag/use/props/union/bindIndex` | 字段树本身就是拖拽和回放协议，不是只读展示数据 |
| 36 | 结构树语义 | 采用递归元素树，而不是纯图层列表 | 表格、容器、Flex 都能持有子树 |
| 37 | 导出链路 | 导出能力挂在 Viewer 运行时适配器层 | 第三方依赖按需加载，不下沉到 core/schema |
| 38 | 页面属性编辑协议 | 描述符驱动，区分规范字段、兼容字段和派生控件 | 对标产品的页面设置窗口不是 `PageSchema` 平面镜像 |
| 39 | Benchmark 页面兼容策略 | codec 必须接受页面原始字段别名噪音 | 公开样例已验证 `scale/scaleType`、背景偏移字段、`blank` 值类型都不一致 |
| 40 | 页面预设字段归属 | 单位展示、纸张预设等编辑器便利信息不直接落入 `page` 规范字段 | 避免把工作台视图噪音写进模板资产 |
| 41 | 表格 Schema 结构 | 采用 topology(columns[] + rows[]) 模型，行通过 role 属性标记语义（normal/header/footer/repeat-template），废弃 sections[] 和 bands[] | 列宽独立于行管理；行角色替代 band 容器，更轻量 |
| 42 | 表格列宽存储 | 归一化比例(0-1)，所有列 ratio 总和 = 1 | element.width 驱动实际宽度；resize 元素整体时列宽自动等比伸缩；避免列宽与元素宽度的双来源冲突 |
| 43 | 表格行高存储 | 绝对值（文档 unit） | repeat-template 行运行时动态重复，行高比例语义不成立 |
| 44 | 列 resize 交互 | 推动右侧 + 变总宽 | 拖拽列边线修改当前列 ratio，右侧列位置平移，element.width 随之变化。不是此消彼长 |
| 45 | 表格编辑状态机 | idle -> table-selected -> cell-selected -> content-editing（废弃 band-selected） | band-selected 作为必经层级没有价值；section 上下文由 cellPath 自动推断 |
| 46 | 表格深度编辑入口 | 单击格子进 cell-selected，双击格子进 content-editing | 第一次单击表格 = table-selected，再次单击格子区域直接进入 cell-selected |
| 47 | 深度编辑退出 | 点击外部直接回 idle，Esc 逐层退出 | 点击空白/其他元素时直接退出最省操作步骤；Esc 逐层退出供精确控制 |
| 48 | 深度编辑拖拽把手 | extension protocol 驱动的外部拖拽把手（左上角元素外） | 声明了 deepEditing FSM 的元素 body 不再响应拖拽；把手位置避免被页面裁切 |
| 49 | element 级 handle 切换 | 进入深度编辑后 resize/rotate handle 全部隐藏 | 避免与 overlay 内部手柄（列/行 resize）视觉和交互重叠 |
| 50 | overlay 渲染方式 | 设计器提供 DOM 容器（PhaseContainers），物料自行渲染 | 物料对 overlay 有完全控制权；DOM 容器方式解耦度和测试性优于返回 VNode |
| 51 | overlay DOM 挂载位置 | 页面级绝对定位容器 | 不受元素 transform 影响，手柄 hitTest 和视觉一致性更可靠 |
| 52 | 表格浮动工具条位置 | 固定在表格正上方 | 不跟随 cell 移动，避免遮挡相邻单元格 |
| 53 | 深度编辑能力声明 | 通过 extension protocol 的 deepEditing FSM 定义声明，而非 capability flag | MaterialCapabilities 仅保留 keepAspectRatio 等布局标记；deep editing 通过 FSM 自描述 |
| 54 | 表格 undo/redo 粒度 | CompositeCommand 模型 | 表格批量操作（插入列 = 修改 columns + 每行 cells + 合并单元格 colSpan）打包成一条原子命令 |
| 55 | 表格数据存储位置 | TableNode extends MaterialNode，顶层 table 字段 | 不再使用 extensions.table；通过 isTableNode 判别函数访问 |
| 56 | 格子内容 | 仅纯文本，不预留子物料槽 | Cell 内嵌子物料的递归 deep editing 复杂度过高，直接放弃 |
| 57 | v1 单元格选择 | 仅单选 | cellPath 为单值；多选后续扩展 |
| 58 | 列操作与合并单元格交互 | 自动调整 colSpan | 插入列时合并单元格 colSpan 扩展，删除列时 colSpan 收缩（减到 1 变普通单元格） |
| 59 | 现有表格代码处理 | 重写而非迁移 | 现有 sections[] 实现量不大，直接按新 topology + row role 模型重写更干净 |
| 60 | 多选与深度编辑 | 互斥 | 进入深度编辑前必须取消多选；同一时刻只有一个元素可进入深度编辑 |
| 61 | Extension protocol | 统一 extension protocol，所有复杂物料通过声明式 FSM 自治 deep editing 全生命周期 | 取消 table 的 hardcode 特殊处理，extension 抽象不再被绕过 |
| 62 | Cell 内容模型 | Cell = 纯文本展示形态，不做子物料容器 | 递归 deep editing 复杂度收益比不划算，放弃 cell 内嵌子物料 |
| 63 | Extension 新增协议 | 状态机 + 子选择 + Resize + Keyboard 四项协议 | 当前 5 个扩展点不足以覆盖复杂物料的 deep editing 需求 |
| 64 | 状态机声明形式 | 声明式 FSM：物料声明 phases + 转换规则，设计器驱动执行 | 设计器负责 idle/selected/deep-editing 基础状态，物料在 deep-editing 内部自治 |
| 65 | Overlay/Toolbar 渲染 | 设计器给 DOM 容器，物料自行渲染 | 物料对 overlay 有完全控制权，测试性和解耦度优于返回 VNode |
| 66 | 渲染职责分工 | 设计器管选中框/resize handle/对齐线/拖拽，物料管内容区域 | 跨物料交互（多选、对齐、拖拽）不应由物料重复实现 |
| 67 | Extension 生命周期 | Phase onEnter/onExit 回调 | 每个 phase 独立 mount/unmount DOM，无状态残留 |
| 68 | Extension 注册形式 | 工厂函数 createExtension(context) | 复杂物料需要 lifecycle、状态、DOM 管理，纯对象字面量不够 |
| 69 | 物料与设计器通信 | Context 查询 + 事件指令混合 | Context 提供读取能力（schema、selection），事件提供写入能力（commit command、请求属性面板切换） |
| 70 | Band 模型 | 取消 band 容器，用 Row role 属性替代 (normal/header/footer/repeat-template) | Band 承载的打印语义可降维为 row-level 属性，band 容器过重 |
| 71 | 数据源绑定粒度 | table-data 采用表级主数据源 + cell 继承绑定 | table.source 是唯一数据入口，cell.binding 自动继承 sourceId，严格单源。简化用户操作和 Viewer 解析 |
| 72 | Binding overlay | Drop zone + 当前悬停 cell 高亮 + 字段类型匹配 | 只高亮当前悬停 cell，不是所有 cell 同时高亮 |
| 73 | table-kernel 定位 | 降级为纯工具库，不做抽象层 | 复杂物料的内部逻辑全部通过 extension protocol 暴露，不需要独立 kernel 抽象 |
| 74 | table-static/table-data 关系 | 保持分离 | table-data 有 Row repeat + row role，table-static 是纯网格；差异足以支撑两个独立物料 |
| 75 | Schema FSM 感知 | Schema 无感知 FSM | FSM 定义只存在于 extension 代码，Schema 不记录 editing phases。Viewer 不需要感知深度编辑能力 |
| 76 | Schema 迁移 | 不迁移，全新开始 | 旧 bands + 主数据源 Schema 与新 row role + cell binding 模型不兼容，直接重建 |
| 77 | 对外 API | Breaking change OK | 重构后的 extension protocol 就是最终 v1 接口，之前的不兼容不管 |
| 78 | Viewer 与 extension | Viewer 完全独立 | Viewer 只需读懂新 Schema（row role、cell binding），不需感知 extension protocol |
| 79 | repeat-template 绑定路径 | 相对路径语义 | 行内单元格 fieldPath 相对于 table.source.fieldPath 集合项解析，非 repeat-template 行使用绝对路径 |
| 80 | table-static 行角色 | 仅允许 role = 'normal' | 静态表格不涉及打印分区和数据重复，限制无效状态 |
| 81 | renderContent 更新机制 | 框架无关 NodeSignal：get() + subscribe() | renderContent 接收 NodeSignal，物料首次挂载后通过 subscribe 增量更新，不依赖 Vue |
| 82 | 表格分页模型 | 取消 TablePageSlice，PagePlanner 直接生成行序列 | PagePlanner 从 row role 直接生成每页 TablePageRowSequence，不需要中间 Slice 抽象 |
| 83 | UpdateTableSectionCommand | 废弃，替换为 UpdateTableRowRoleCommand | Band/section 概念已取消，行角色修改直接操作 row.role |
| 84 | 插入/删除行的 undo 粒度 | CompositeCommand 包含 element.height 联动 | 行操作不再维护 band rowRange，改为重算 element.height |
| 85 | 相对/绝对路径区分机制 | 行 role 隐式决定 | repeat-template 行内一律相对解析，其他行一律绝对。不修改 BindingRef 结构 |
| 86 | repeat-template 行展开职责 | 协作模式：表格 ViewerExtension measure + PagePlanner 切分 | 表格最了解自身行结构，PagePlanner 最了解页面空间。各司其职 |
| 87 | 单元格绑定解析时机 | ViewerRuntime 在 resolveAllBindings 阶段通过单一入口预解析 | 从 table.source 取集合数据，按 row.role 区分相对/绝对路径，表格 ViewerExtension 只消费结果 |
| 88 | renderContent 信号实现 | 框架无关 NodeSignal：get() + subscribe() | Extension 代码不依赖 Vue，Designer 内部包装 Vue computed 为 NodeSignal |
| 89 | renderContent 返回值 | 返回 cleanup 函数 | 元素从画布移除时调用 cleanup 清理 DOM 和订阅 |
| 90 | resolveBindingValue scope 参数 | 添加可选 scope 参数 | scope 存在时从 scope 解析（相对路径），不存在时从 root data 解析（绝对路径） |
| 91 | 物料注册表统一性 | Designer 和 Viewer 分离注册 | Viewer 在 iframe 内是独立进程，无法共享注册表实例。物料包分别导出 designer/viewer 注册入口 |
| 92 | measure 上下文 | measure 接收预解析结果 | ViewerRuntime 已通过 table.source.fieldPath 取出集合数据并完成单元格绑定预解析，measure 不自行解析路径 |
| 93 | 表格跨页渲染入口 | 每页生成虚拟 TableNode | PagePlanner 切分后为每页生成虚拟节点，保持 render(node) 接口统一，ViewerExtension 不感知分页 |
| 94 | 跨 role 合并单元格 | 严格禁止 | 不同 role 的行（header/repeat-template/footer/normal）之间不允许合并单元格，避免 Viewer 分页语义矛盾 |
| 95 | TableCellSchema.content | 可选字段 | 新插入单元格可不携带 content，渲染层视缺失为空字符串。避免强制构造开销 |
| 96 | 删列与绑定 | 静默删除 + undo | 删列时不弹确认不产诊断，undo 就是安全网 |
| 97 | table-flex 类型 | 移除 | isTableNode 判别函数中移除 table-flex，架构文档未定义此类型 |
| 98 | 插入行 role 继承 | 继承相邻行 role | 新行继承插入位置相邻行的 role，跨 role 组边界时默认 normal |
| 99 | role 排列顺序 | 强制 header-body-footer 顺序 | header 在顶、normal/repeat-template 在中、footer 在底。Viewer 依赖此顺序，不做排序 |
| 100 | 设计态绑定标签 | 优先用 binding.fieldLabel | 先查 binding 内存的 fieldLabel，fallback 到数据源字段树节点的 name/title |
| 101 | 行插入顺序违反 | 命令层自动纠正 | 如果继承的 role 违反 header-body-footer 顺序，自动调整插入位置到合法区域 |
| 102 | repeat-template 数量 | v1 单组 | 多个连续 repeat-template 行可以，但只绑定一个集合数据源。多组 repeat 后续扩展 |
| 103 | table-data 打印属性位置 | TableLayoutConfig | 空行填充等打印属性放在 layout 配置中，table-static 忽略。repeatHeader/showSummaryOnLastPage 由 row.role 自行表达，不再需要显式字段 |
| 104 | table-data 主数据源 | TableDataSchema.source: BindingRef | 表级主数据源指向集合字段，整表严格单源。简化用户操作（拖字段自动继承 source）和 Viewer 解析（不从 cell 反推集合路径） |
| 105 | TableSchema 类型拆分 | TableDataSchema extends TableSchema | TableSchema 基类含 kind + layout + topology。TableDataSchema 继承基类加 source: BindingRef。通过 isTableDataNode 判别函数窄化类型 |
| 106 | cell.binding 类型 | 单值 BindingRef，非数组 | cell 为纯文本内容，无多参数绑定场景。去除 BindingRef[] 简化类型和命令层 |
| 107 | cell.binding sourceId 策略 | 自动从 table.source 填充 | 存储时自动复制 sourceId/sourceTag，用户只关心 fieldPath。Viewer 直接读取，不做继承推断 |
| 108 | 首次拖入自动设置 source | 首次拖入字段自动设置 table.source | 后续拖入字段必须属于同一 sourceId，否则拒绝并提示。消除显式绑定 source 的操作步骤 |
| 109 | 解除 source 清除 cell binding | CompositeCommand 原子清除 | 解除 table.source 时清除所有 cell.binding，整体 undo 恢复。更换 source 等价于先解除再重新绑定 |
| 110 | fillBlankRows 语义 | 自动填充空行到页底 | 行数由页面剩余空间和 repeat-template 行高自动计算，不需要 rowsPerPage 字段 |
| 111 | repeatBinding 废弃 | 移除 row.repeatBinding | 集合路径由 table.source.fieldPath 提供，repeat-template 行不再需要独立的 repeatBinding 字段 |
| 112 | 严格单集合 | v1 每表仅一个集合数据源 | 不支持多组 repeat-template 绑定不同集合。schema 结构不预留扩展（table.source 为单值非数组） |

## 22.1 已明确废弃的旧前提

以下旧方向不再作为主架构前提：

- “只做单页/连续纸，不考虑分页文档”
- “数据源只是一棵拖拽字段树”
- “运行时只吃业务方预扁平对象”
- “设计器本身就是预览器”
- “表格只是特殊一点的普通元素”
- “模板库只是示例内容”
- “Designer 是固定三栏布局”
- “历史/动画/概览天然属于底部抽屉，而不是窗口对象”
- “对标产品原始 JSON 就是内部规范模型”
- “属性窗口可以拆成页面属性和元素属性两个互不相关的系统”
- “页面属性面板只要有 `width / height / mode` 三项输入就够了”
- “表格编辑必须经过 band-selected 中间层级”
- “表格列宽是绝对值，每个 cell 自持宽度”
- “表格数据存储在 node.extensions.table”
- “sections[] 扁平模型足够支撑表格结构”
- “TablePageSlice 是表格分页的必要中间抽象”
- “renderContent 每次传入新 node 快照（无 signal 订阅机制）”
- “table-static 行可以有 header/footer/repeat-template 角色”
- “repeat-template 行内单元格使用绝对路径”
- “renderContent 返回 HTML 字符串”
- “表格 ViewerExtension 自行调用 resolveBindingValue 解析绑定”
- “PagePlanner 单独负责表格行展开和分页”
- “renderOverlay 返回声明式描述对象”
- “复杂元素可以通过 body 拖拽移动”
- “table-data 必须有主数据源”（已恢复为正确前提：table-data 采用表级主数据源 + cell 继承绑定）
- “cell 独立声明 sourceId，不存在表级主数据源”（已废弃：严格单源，cell 自动继承 table.source 的 sourceId）
- “Band 容器（title/header/data/summary/footer/blank）是表格结构的必要组成”
- “MaterialDesignerExtension 返回 Vue VNode”
- “MaterialDesignerExtension 返回 HTML string”
- “物料的 deep editing 能力通过 capability flag 声明”
- “table-kernel 是抽象层”
- “cell 可以内嵌子物料树”
- “table-flex 是合法的表格类型”
- “合并单元格可以跨越不同 role 的行”
- “repeat-template 行需要独立的 repeatBinding 字段”
- “cell.binding 需要 BindingRef[] 数组支持”
- “fillBlankRows 需要配合 rowsPerPage 字段”
- “repeatHeader 和 showSummaryOnLastPage 需要显式配置字段”
- “TableSchema 单一类型同时服务 table-static 和 table-data”

## 22.2 当前优先级

当前实现优先级按以下顺序推进：

1. 建立 Schema、Viewer、Designer、DataSource 的一致模型。
2. 优先做文本、图片、二维码/条码、数据表格、静态表格、容器。
3. 再补 SVG、关系图、图表和动画等增强能力。

这份 ADR 页的目标是持续约束后续实现，避免文档再次偏回“轻量打印模板工具”的路线。
