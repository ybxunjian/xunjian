# 公共 UI 与交互

本文件维护组件复用、尺寸和动画参数；视觉原则见 [设计规范](../DESIGN.md)，业务与数据规则见 [巡检规则](./inspection-rules.md) 和 [数据与同步](./data-and-sync.md)。所有界面样式消费 [globals.css](../src/app/globals.css) 令牌。

## 复用边界与入口

通用结构放 `src/components/ui/`，跨表单组合放 auth，巡检/账号专属组件留在各 feature。同类控件通过 variant、属性或插槽表达差异，提交、存储、选择规则和请求判断留在调用方。修改公共实现必须核对全部调用位置。

| 公共实现 | 复用位置与职责 |
| --- | --- |
| [Button](../src/components/ui/button.tsx)、[Card](../src/components/ui/card.tsx) | 全项目基础按钮与卡片 |
| [Sheet](../src/components/ui/sheet.tsx)、[DialogHeading](../src/components/ui/dialog-heading.tsx) | 账号、保存校验弹层；标题也用于备份页面 |
| [TextField](../src/components/ui/text-field.tsx)、[FormError](../src/components/ui/form-error.tsx) | 凭据输入、字段错误关联、预留空间与整体错误 |
| [CredentialForm](../src/features/auth/components/credential-form.tsx)、[CredentialHeading](../src/features/auth/components/credential-heading.tsx) | 登录、注册、密码恢复及账号密码表单组合 |
| [PasswordField](../src/features/auth/components/password-field.tsx) | 组合 TextField 与原生密码显隐 |
| [useFieldFeedback](../src/hooks/use-field-feedback.ts) | 字段错误、重复抖动及清理 |
| [LongPressReorderItem](../src/components/ui/long-press-reorder-item.tsx) | 长按手柄激活排序、拖动项表面与手势清理；导航顺序和保存由账号调用方管理 |
| [ActionTile](../src/components/ui/action-tile.tsx)、[ClearButton](../src/components/ui/clear-button.tsx) | 图标操作行与局部清空 |
| [DirectionalViewTransition](../src/components/ui/directional-view-transition.tsx) | 历史列表、详情、日历、备份切页 |
| [SplitConfirmationButton](../src/components/ui/split-confirmation-button.tsx) | 批量删除、详情删除、退出登录的内容层与分裂动画基础 |
| [ConfirmationPopover](../src/components/ui/confirmation-popover.tsx) | 头像移除锚定气泡、焦点与 WAAPI 生命周期 |
| [SectionHeading](../src/features/inspection/components/section-heading.tsx) | 巡检、汇总、历史列表、日历和备份页面标题；标题行至少 44px 高、左右内边距 4px、下间距 16px，统一字号、字重和紧缩字距 |
| [InspectionTabs](../src/features/inspection/components/inspection-tabs.tsx)、[BeltTabs](../src/features/inspection/components/belt/belt-tabs.tsx) | 分别维护一级导航与皮带子导航，不合为万能组件 |

组合类名统一用 `src/lib/utils.ts` 的 `cn()`；新增自定义字号变量需同步其 font-size 分组，避免与颜色类合并时丢失字号。

## 外观基础

### 主题、首绘与订阅

[appearance.ts](../src/lib/appearance.ts) 管理 system/light/dark 三态解析、首绘脚本、系统外观/对比度和跨标签页 storage 订阅；[useAppearance](../src/hooks/use-appearance.ts) 用外部快照订阅，服务端快照固定，不读取浏览器存储。

[AppearanceRuntime](../src/app/appearance-runtime.tsx) 常驻根布局并跟随主题显示 Sonner；浏览器 theme-color 由 appearance.ts 同步。根属性由首绘脚本设置，仅 html 使用 suppressHydrationWarning。[AppearancePicker](../src/components/ui/appearance-picker.tsx) 位于账号面板，三项有图标、文字和 aria-pressed，复用 Button；请求/退场禁用，修改密码展开时随偏好区自然下移并保持显示。

系统变化仅在跟随系统模式改变实际外观，手动模式保持选择；其他标签页更新和删除外观偏好会同步。存储键、格式与账号隔离规则见 [数据与同步](./data-and-sync.md#浏览器存储)。

所有订阅者共用一组系统外观/对比度与 storage 监听。实际外观或系统对比度变化时，根属性 `data-appearance-changing` 暂时排除 CSS 颜色、边框与阴影过渡，保留 transform/translate/scale/rotate/opacity；新配色绘制后解除，快速反向会取消上一次解除回调。日常悬停、聚焦和操作反馈仍用原有过渡。

### 语义配色与复用

所有颜色消费 globals.css；填充按钮和文字强调色分别使用 surface 与普通颜色令牌。浅色保留原有控件边界，深色独立解析；TextField 使用 control-border，原生 select 使用 select-border / select-focus-border，箭头用 Lucide ChevronDown 消费 primary，尺寸见[基础尺寸](#基础尺寸)。Sheet、气泡和深色提示使用抬升表面，浅色提示保留 Sonner 默认配色；两层滑块使用 navigation-selection；尺寸、留白、曲线不因主题变化而改变。

深色相同角色的颜色通过变量引用复用。下表列出当前关系，声明以 [globals.css](../src/app/globals.css) 为准；浅色各角色保持独立解析。

| 深色语义令牌 | 引用 | 普通 / 高对比度结果 |
| --- | --- | --- |
| `navigation-track` | `surface-elevated` | `#28282e` |
| `navigation-muted` | `muted-foreground` | `#bebec8` / `#ededf2` |
| `navigation-selection` | `neutral-control-surface` | `#484850` |
| `navigation-border` | `border` | `#565662` / `#93939f` |
| `card-foreground`、`navigation-foreground`、`input-foreground` | `foreground` | `#f2f2f7` |
| `belt-selection-foreground` | `secondary-foreground` | `#91c6ff` |

### 内层表面与外观选择器

内层底色共用 nested-surface：浅色解析为 card（#ffffff），深色解析为 surface-elevated（#28282e）。ActionTile 的改密钥匙、备份导入/导出底座，以及头像相机底座、账号改密的三个 PasswordField、巡检汇总数值块使用该令牌。TextField 仍保留默认 card 底色，改密通过既有 className 插槽指定内层底色，不影响登录、注册及密码恢复。汇总数值块仅深色去掉小块阴影，浅色保留 shadow-card；其他图标底座阴影、边框、尺寸和字体保持不变。AppearancePicker 选中项底色复用 navigation-selection，浅色 #ffffff、深色 #484850，未选项保持透明；悬停不改变各自底色。

### 状态与提示

账号邮箱已验证使用绿色 CheckCircle2；待验证使用 CircleAlert 和 pending-foreground，浅色 #9a520b，深色沿用 warning（#f5c46d）。状态文案与验证逻辑保持不变。

Sonner 的普通、成功、错误、警告和信息提示底色、文字及边框均由 html 的 data-theme 同帧解析；描述文字与撤销操作沿用对应配色，不等待 React 的 data-sonner-theme 更新，不卸载或隐藏已有提示。

## 数字排版

巡检数字输入、汇总读数及泵编号、同步状态中的时间和数量、历史日期与时间及已选数量、日历日期与年月、备份时间与记录统计使用 `tabular-nums`。仅统一数字字宽，保留现有字体、字号、粗细、格式及布局；不为邮箱、密码或一般设备名称启用，不改变输入和存储规则。等宽数字不会固定不同位数内容的总宽度。

## 基础尺寸

下表的白底、深字等配色描述以浅色外观为基准；深色使用同一语义令牌解析，不更改尺寸和动画。

| 控件 | 当前尺寸和反馈 |
| --- | --- |
| 基础 Button | 默认至少 44px，compact 最少 36px；默认按压 0.97、CSS 200ms。compact 只用于适合的场景 |
| 首页操作 | 新建/保存均为 44px 高、14px 圆角矩形，复用基础 Button 默认圆角；新建用 inverse，浅深色固定白底 #ffffff、深蓝灰字 #0f172a，悬停 #f1f5f9；保存沿用各主题 primary-surface |
| 辅助流程操作 | 备份恢复/替换、保存校验的两项操作、验证邮件重发均为 44px 高胶囊；配色与布局由原场景维护 |
| 两层分段导航 | 44px 轨道、4px 内边距、36px 可见项；透明伪元素纵向扩充点击到 44px。外圆角 22px、项圆角 18px。滑块参数见 [两层导航](#两层导航) |
| 原生泵号 select | 108px 宽、当前盒高 44px，焦点过渡 180ms；ChevronDown 为 20px、2.5px 线宽、右侧 14px |
| TextField 邮箱/密码 | 最小 52px、字体 16px，胶囊；普通错误区另预留 24px，带忘记密码操作行最小 44px |
| 认证提交按钮 | 登录、创建账号、发送重置邮件及恢复页保存新密码均由 CredentialForm 渲染，复用 credentialPrimaryButtonClassName，最小 48px、字体 16px、胶囊圆角 |
| 重置邮件发送后的返回登录 | 与登录提交按钮复用 CredentialForm 导出的 credentialPrimaryButtonClassName：主操作蓝底白字、最小 48px、字体 16px、胶囊圆角，沿用 Button 默认悬停与按压反馈；外部间距由所在页面维护 |
| 账号改密取消/保存 | 44px 胶囊、8px 间距、按压 0.99，无边框；配色见[取消配色](#取消配色)，保存使用主操作色 |
| 历史详情入口 | 可见浅色圆形 34px、点击区域 44px、箭头 18px |
| 历史菜单 | 切换 SVG 28px、功能 Lucide 21px，均保留 44×44px 点击范围；切换按压 0.92，功能项不缩放 |
| 日历有记录的日期 | 复用 Button 的 ghost，与日历翻月、账号关闭和恢复默认共用悬停反馈；高至少 44px、宽随网格且不超过 48px，无内边距；今天底色及记录跳转规则由日历维护，无记录日期保持不可点击的文本 |

## 按钮悬停与复用

公共 [Button](../src/components/ui/button.tsx) 维护各 variant 的基础颜色、悬停和按压反馈。调用方通过 variant、size 与 className 表达场景差异；保留业务组件明确覆盖的悬停规则，不给全站 button 添加统一变色层。分裂确认的颜色与几何动画继续由专属组件维护。

| 当前入口 | 悬停规则与复用来源 |
| --- | --- |
| 首页保存、登录、创建账号、发送重置邮件、保存新密码、重置邮件发送后的返回登录、账号保存密码、返回补充、备份恢复新记录 | Button 默认主操作：primary-surface 背景透明度由 100% 变为 90%，文字不变；各场景的高度、字号、圆角按上表维护 |
| 首页新建 | Button inverse：白底变 inverse-hover，浅深色相同 |
| 账号关闭、导航排序恢复默认、清空、日历翻月及有记录日期 | Button ghost：悬停底色为 muted；日期的今天底色仍由业务提供 |
| 修改密码取消 | credential-cancel-surface / foreground：浅色白底深字、深色灰底浅字，悬停保持各自底色；尺寸和按压仍采用账号改密规则 |
| 头像移除气泡的确认移除与取消 | 两项均覆盖悬停为各自原底色；尺寸及焦点见[头像移除气泡](#头像移除气泡) |
| 历史列表详情圆形箭头 | 外层保持透明；内圆悬停使用 history-entry-hover-surface，主题差异见[入口、卡片与复选框](#入口卡片与复选框) |
| 详情返回/取消、详情删除/确认、批量删除/确认及取消、退出登录入口及取消 | 悬停不额外变色，保留分裂动画；退出登录展开后的确认退出沿用 destructive 的 90% 背景透明度悬停 |
| 历史快捷菜单、外观选择、修改密码与备份导入/导出的 ActionTile | 悬停不变色；选择、按压及开合反馈按各自组件维护 |

上述主操作悬停只改变背景色的 alpha，不改变整个按钮及文字的 opacity；最终颜色与按钮背后的表面有关。备份“没有需要新增的记录”处于 disabled，不呈现可用按钮的悬停反馈。公共 Button 禁用时通过 pointer-events-none 阻断指针交互，统一降低整体透明度；触屏是否呈现悬停由设备及浏览器决定，不能把截图中的底色直接当作悬停证据。

重置邮件发送后的返回登录与认证提交按钮共用样式常量，外部间距分别由页面/表单提供。忘记密码表单上方的返回登录、邮箱验证提示中的返回登录仍是各自的辅助操作，不套用该主按钮尺寸。

## 两层导航

### 语义与显示

两层导航分别使用 aria-current 和 aria-pressed。主导航文字统一 800 字重、不随选中放大，浅色保持浅灰轨道、白色滑块、深色选中文字与灰色未选中文字；深色由 navigation 令牌提供深色轨道与更亮滑块；皮带子导航保持 700 字重，选中文字使用 belt-selection-foreground，浅色白底蓝字，深色使用对应语义令牌。文字始终在滑块上方。主导航平时无滑块阴影，按住浮起时复用 shadow-floating。

### 滑块参数

两层导航共用 [segmented-navigation-controller.ts](../src/components/ui/segmented-navigation-controller.ts)，分别维护常驻滑块与独立手势状态。坐标相对各自轨道，项间距通过按钮实际坐标测量，兼容主导航四项与皮带子导航三项及其 4px 间隙。文字高亮跟随滑块最近项，业务选择在点击或松手确认后提交。

[useSegmentedNavigation](../src/components/ui/use-segmented-navigation.ts) 统一 React 与控制器的接线：保存首次位置、读取最新选择回调、同步外部选择，并在项目顺序或减少动态效果变化时销毁并重建控制器。两个业务组件只传入项目 ID、当前值和回调，分别维护原有 DOM、样式和无障碍语义。

渲染跳过值完全相同的 transform 与按压透明度写入；高亮属性首次完整初始化，之后仅在最近项改变时更新旧项和新项。90ms 速度采样数组原位清除过期前缀，不逐次分配筛选数组；采样边界、运动计算、帧调度及坐标测量时机保持一致。

| 参数 | 当前值 |
| --- | --- |
| 选择弹簧 | 刚度 360、阻尼 36、质量 1；来源为 [SEGMENT_SELECTION_TRANSITION](../src/components/ui/segmented-navigation-motion.ts) |
| 横向拉伸 | 最多 10%，在 45–595px/s 映射 |
| 纵向压缩 | 横向拉伸量的 22% |
| 方向偏移 | 拉伸量 × 项间距 × 12% |
| 拉伸增长 / 恢复 | 时间常数 35ms / 115ms |
| 方向平滑 | 时间常数 50ms |

### 按下、拖动与松手

按下立即捕获指针并开始弹簧追踪，无长按等待或水平距离门槛；滑块从当前显示位置追赶，不直接跳到手指位置，同时放大到 1.15 倍。距离手指小于 8px 或追赶达到 180ms 后，通过 120ms smoothstep 混合为直接跟手。

松手目标取松手横向位置最近的一项，不按速度预测或额外跳项。速度取最近 90ms 样本，仅供跟手阶段松手后的归位动画沿用，上限 1400px/s。有效指针捕获期间移到轨道外仍由控制器处理，横向坐标限制在首尾项范围内；释放事件落到轨道外的 window 且没有正常捕获转发时，备用监听按取消处理。

轨道使用 touch-action: none，按下即接管导航手势，touchmove 阻止滚动接管。从导航上开始的竖向移动不会滚动页面或结束拖动，持续跟随直到松手；导航外仍可正常滚动页面。

### 打断、键盘与减少动态效果

浏览器指针取消或丢失捕获回到已选页面，不提交预览项；失焦、尺寸变化、外部选中变化或卸载清理当前手势。导航排序变化会重建对应业务包装层的控制器。原生按钮支持键盘点击，左右方向键、Home、End 切换并聚焦对应按钮。

两层吸顶时分别维护轨道内横向坐标与状态，互不带动。首次挂载不播放；减少动态效果立即定位，禁用拉伸、按住放大和浮起阴影。

## 表单反馈

认证间距由 globals.css 的 credential/auth 变量维护：普通输入边缘间距 30px（含 24px 错误区），普通末框到提交按钮 41px。Logo 到标题 19px、标题到说明 11px、标题说明区域到表单 22px、提交到切换区 15px。账号密码框复用同一字段间距；字体和横向留白不随控件高度缩放。

`PasswordField` 只切换原生 `password` / `text`，不使用 CSS 密码遮罩。`TextField` 关联 label、aria-invalid、aria-describedby 和错误 alert；`useFieldFeedback` 的 report 递增错误字段抖动序号，输入时 clear，模式切换时 reset。`field-shake` 在全局定义一次：360ms ease-out，横向位移 0、−6、6、−4、4、0；CSS 减少动态效果规则压缩它。

## 历史信息与操作栏

### 入口、卡片与复选框

历史详情入口圆底使用 history-entry-surface，浅色为 background，悬停为 muted；深色普通与悬停均为 #484850。详情删除圆底使用 detail-delete-entry-surface，浅色为 destructive-soft，深色为 #633542；危险图标与展开后的确认红色不变。

历史卡片至少 88px 高。日期 22px / 700，日期辅助行 11px；填写时分 15px / 600，说明 11px。两列使用共享网格和基线，填写时分上移 3px；辅助行独立对齐。完整时间保留在 title 和辅助朗读中。

历史批量选择圆圈为 24px、勾号 14px。浅色保留 2px 边框；深色未选中保留 2px 边框并使用 muted 底色，边框使用 history-selection-border（普通 #83838f，高对比度 #93939f）；选中不显示边框，使用 primary-surface 和白色勾号。

### 底部定位与对齐

详情操作栏在切页 transform 容器外 fixed，保持视口与 Safe Area 定位。左右外缘对齐汇总卡片的内层内容边缘，宽度从页面 max-w-md、页面留白、CardContent 内边距及两侧 1px 卡片边框推导，浅深色一致。

| 390px 视口下的几何 | 当前值 |
| --- | --- |
| 左右边距 / 整组宽度 | 各 33px / 324px |
| 合并状态左侧 / 右侧 | 268px / 48px |
| 分裂状态两侧 | 各 158px |
| 按钮间距 | 8px |

详情操作栏背景透明，无额外底色和渐隐。入场 y=10px、出场 y=8px，与正文共享入场（延迟 40ms、240ms）和退场（100ms、无延迟）参数；正文与操作栏同时挂载，不通过独立的退场等待估算入场时刻。减少动态效果立即切换。

批量操作栏在列表内 sticky，仅实际吸底时显示渐进模糊，短列表排在最后卡片后。装饰层从操作栏上方 32px 延伸到底部 Safe Area 留白，三层 backdrop-filter（2px / 6px / 12px）配合渐变遮罩，使模糊强度由上向下增加；底色消费 background，按钮与已选数量在清晰的前景层，装饰不拦截点击。仅支持 backdrop-filter 与 mask-image 时启用，包括 Safari 前缀；不支持时保留顶部 32px 底色渐隐。减少透明效果关闭模糊层并使用实色。模糊仅限这一局部区域，不为页面添加常驻 will-change 或滚动逐帧脚本。

吸底状态将同一组三层 backdrop-filter 向操作栏下方延伸 96px，覆盖浏览器底栏伸缩时短暂露出的区域；遮罩与底色渐变的原终点保持在操作栏底边，延伸段继续使用已到位的模糊和 75% background 混色，不接实色底板。`HistoryList` 的全宽边界使用 overflow: clip，将装饰限制在列表范围内，不创建滚动容器或增加滚动高度；按钮布局独立于装饰层。短列表未吸底时不显示装饰；减少透明效果或不支持滤镜/遮罩时使用实色绘制补底。

## Sheet 与页面切换

### Sheet

`Sheet` 在调用方的 AnimatePresence 内使用，labelledBy 对应实际标题，busy 与业务按钮 disabled 配合。公共组件管理弹层栈、整页滚动锁定、顶层焦点与 Escape；非顶层和退场面板 inert / aria-hidden。开始退出清除内部焦点，关闭后不主动恢复入口焦点。保存校验退出时遮罩不拦截页面点击。

面板外圆角 26px、内容留白 16px，保存校验的整宽状态块圆角 10px，保持内外平行轮廓。面板位移 40px，弹簧刚度 420、阻尼 34；遮罩用 Motion 默认 tween。减少动态效果时立即切换。普通面板最高 `100svh - 2rem`，内部滚动；账号密码展开可按记录的 topOffset 锚定顶部。

### 一级页面

一级板块在 `InspectionAppContent` 原位即时切换，页面内容不等待退场，也不播放平移或淡入；保存后进入历史采用同一规则。内容使用 mode="sync" 的 AnimatePresence 按板块 key 切换，退出内容立即 hidden / inert；仅为 Portal 菜单保留退场生命周期，不延迟新内容显示。历史菜单位于内容容器外的静态容器。

### 历史子页面

历史内部由 `DirectionalViewTransition` 统一：前进 direction=1，返回 −1；mode="sync"，新页在状态切换时挂载，旧页用 100ms、`[0.4, 0, 1, 1]` 退场，新页延迟 40ms 后用 240ms、`[0.25, 0.1, 0.25, 1]` 入场，总时间线 280ms。两页在同一网格单元短暂交接，退场页立即 inert / aria-hidden，不能重复点击或被辅助技术读取。网格保留两页自然高度，旧页卸载后以当前页高度为准，不逐帧测量或动画化高度。

前进旧页向左 14px 退出、新页从右 18px 进入；返回旧页向右 18px 退出、新页从左 18px 进入。首次挂载不播放，减少动态效果立即切换；容器 overflow-x: clip，保留整页竖向滚动。

横移通过完整的 `transform: translateX(...)` 表达，与 opacity 一同交给 Motion 的浏览器原生动画路径；presence、打断与卸载由 Motion 管理。不支持或不满足原生动画条件时由 Motion 回退。原生动画不保证合成层或固定帧率，不为所有卡片添加 will-change，也不把内容挂载成本归为已经消除。

列表中的 `history-record-card` 在同时支持 `content-visibility: auto` 和自动固有块尺寸的浏览器中，跳过远离视口的卡片内容布局与绘制；所有记录仍保留在 DOM，选择、详情入口和数据不变。不支持时沿用普通布局。

占位内容高度与 `min-h-22` 共用 spacing 基数：默认 88px 内容加 2px 卡片边框，总高 90px，不含 8px 下边距；浏览器绘制后记住实际内容高度，换行或文字放大不锁死为占位值。只优化列表卡片，不对详情、页面动画容器或批量操作栏施加内容包含。

## 历史菜单

### 定位与滚动锚定

实现为 `HistoryQuickMenu`，通过 Portal 位于一级动画外的静态容器，层级低于吸顶主导航。根容器 overflow-anchor: none，只排除菜单子树，避免 SVG 线条变形引发浏览器滚动补偿。

### 状态与时间线

历史菜单功能项为透明 ghost，无圆背景、边框、阴影、悬停底色或悬停说明；无障碍名称仍保留。

一次操作由最终页面/模式状态触发动画。切换到其他主导航或进入详情使用 `data-history-menu-transition="exit"`，外部点击忽略此标记，避免先普通收起、再退出。普通外部点击、叉号和 Escape 按正常逻辑收起；日历、备份、批量、返回和完成保留各自目标图标。

外部关闭与按钮切换均以完成的 click 为准；文档捕获阶段用 composedPath 判断菜单内部及切页标记，避免触摸边缘的 pointerdown / click 命中差异造成先关再开。滚动或取消手势不单独关闭菜单。按钮用透明伪元素补满含四角的 44×44px 点击区域，保留圆角焦点提示；按压只缩放内部 SVG 至 0.92。SVG 不参与指针命中，汉堡变形、出现及消失时间线保持不变。

| 部分 | 当前时间线 |
| --- | --- |
| 功能按钮组入场 | 220ms，`[0.25, 0.1, 0.25, 1]`；从右移 8px、opacity 0 到原位、opacity 1；尺寸和间距固定 |
| 功能按钮组退场 | 180ms，`[0.4, 0, 1, 1]`；向右移 8px 并淡出；位移与透明度同进度，无缩放或逐项延迟，完成后卸载 |
| SVG 线条 | 汉堡、叉号、箭头和勾的首次出现与消失均 340ms；图标之间变形保持 300ms，同一曲线 |
| 中线绘制长度 / opacity | 200ms；形成左箭头时延迟 80ms |

功能按钮组使用完整的 `translateX(...)` transform，由 Motion 在支持时使用浏览器原生动画，不支持时自动回退。SVG 路径仍由 Motion 插值；每条线独立放入透明度组，避免路径变形时重复写透明度，并保持交叉处的叠加效果。中线固定 `pathLength=1`、`strokeDashoffset=0`，仅插值无单位的 `strokeDasharray`，保持原有归一化绘制长度及时间线，不逐帧重写固定属性。

### 退场与快速重入

叉号退出直接向中心收缩并淡出，不先变三横线；返回列表从中心展开成三横线。叉到左箭头保留斜线方向，向箭尖折合，横线随后伸出。退场由 isPresent 禁用，减少动态效果直接切换。菜单 AnimatePresence 仅在未选详情时 propagate，空菜单不参与一级导航退出等待。一级内容退出时立即隐藏，Portal 菜单独立完成收缩后卸载；退出期间 inert / aria-hidden，快速切回历史时清除菜单展开状态并还原列表，汉堡按上表首次出现的时间线从中心重新出现；叉号、日历/备份箭头和批量管理勾均不恢复旧形态。图标之间的普通变形使用上表形态变换时间线。

Portal 内的实时菜单仅在 `isPresent && !selectedRecord` 时渲染，退出快照由 AnimatePresence 保留。不能在父级 propagated exit 时继续传入同一个 `history-menu` 子节点，否则可能重复保留同 key 菜单。快速重入通过历史页面 visit key 重建内部切页容器，立即显示列表；菜单从中心重新入场，不接续旧图标变形。

## 公共分裂确认

公共动画基础维护在 [SplitConfirmationButton](../src/components/ui/split-confirmation-button.tsx)；详情专属的宽度、文字交接和颜色完成进度维护在 [detail-record-actions-motion.ts](../src/features/inspection/components/history/detail-record-actions-motion.ts)。业务控件负责提交、焦点和取消行为。

### 公共实现与时间线

`SplitConfirmationButton` 复用 Button。关闭/打开内容采用固定绝对居中层，默认交叉淡入淡出；调用方可通过 closedContentOpacity / openContentOpacity 提供自定义透明度，通过 closedContentRef / openContentRef 连接内容层原生动画，不测量、裁切或缩放文字。调用方提供当前 aria-label，视觉层 aria-hidden。

closedContentClassName / openContentClassName 提供内容层样式插槽。账号退出入口的关闭文字层使用 `will-change: opacity` 保持合成层稳定，避免其他按钮的按压或气泡动画触发文字边缘重绘变化；仅限这一小块文字，不给整页或所有按钮常驻合成层。底板、几何参数和文字淡入淡出时长保持原有规则。

| 方向 | 几何时长 | 曲线 |
| --- | --- | --- |
| 展开 | 280ms | `[0.25, 0.1, 0.25, 1]` |
| 合回 | 220ms | `[0.25, 0.1, 0.35, 1]` |

默认文字与几何同等时长，使用 easeInOut，无延迟。`getSplitConfirmationTransition` 提供统一参数；`useSplitConfirmationMotion` 在打断后从当前进度接续，清理停止自身动画，退场不重新启动。需要渐变的调用方用 `useSplitConfirmationColor` 解析语义令牌再插值；传入承载元素 ref 与颜色属性，在外观和系统对比度变化时按当前进度重新解析，同时更新 MotionValue 和 DOM 色值，使其与 CSS 表面同帧换色，不重启几何动画。混色算法沿用 Motion mix，进度插值不变。减少动态效果立即切换。

详情两侧宽度及返回/取消文字透明度、批量取消的 right 偏移及独立背景透明度，由 [useNativeStyleTransition](../src/components/ui/use-native-style-transition.ts) 通过 WAAPI 执行，MotionValue 只维护基础样式与打断快照。原生动画采用 Motion 同源时钟，保持与详情混色进度的时间线对齐；打断时按当前进度插值并保留 calc 百分比，避免窗口变化后宽度冻结为像素。完成写回最终样式并取消动画层，退场或卸载仅清理自身动画；减少动态效果立即切换，无 WAAPI 时回退 Motion。宽度与 right 仍需布局，此路径减少 JS 逐帧样式写入，不保证固定帧率。退出登录保留现有实现。

### 三组布局

| 调用方 | 默认 → 确认布局和配色 |
| --- | --- |
| `AccountSignOutControls` | 完整 44px 高红胶囊 → 两个等宽胶囊，各从原 50% 减 4px，中缝 8px，内圆角从 0 到 22px；取消使用 secondary-action-surface / secondary-action-foreground，确认红底白字 |
| `DetailRecordActions` | 48px 高蓝色返回胶囊 + 48px 浅红删除圆形 → 中性底色取消 + 红底白字确认删除；两侧各占 `(100% - 8px)/2`，保持 8px 间距 |
| `BatchDeleteControls` | 76×44px 红色“垃圾桶＋删除” → 原尺寸原位置红色“确认” + 左侧 76×44px 中性底色取消，间距 8px |

### 取消配色

| 使用位置 | 底色 / 文字令牌 | 浅色 | 深色 |
| --- | --- | --- | --- |
| 详情删除、批量删除取消 | `neutral-control-surface` / `foreground` | `#dce2eb` / `#0f172a` | `#484850` / `#f2f2f7` |
| 退出登录、移除头像取消 | `secondary-action-surface` / `secondary-action-foreground` | `muted` / `foreground` | `neutral-control-surface` / `foreground` |
| 修改密码取消 | `credential-cancel-surface` / `foreground` | 白底 #ffffff / 深字 #0f172a；悬停保持白底 | 灰底 #484850 / 浅字 #f2f2f7；悬停保持灰底 |
| 保存校验“仍然保存” | `secondary-action-surface` / `foreground` | `muted` / `foreground` | `neutral-control-surface` / `foreground` |

详情与批量取消的底色独立于 `card` / `muted`，避免与滚动卡片融合。退出登录、头像气泡与保存校验的次要操作共用语义底色；修改密码取消浅色使用 card，深色复用 secondary-action-surface，文字使用 foreground；悬停保持各自底色，无边框、无阴影。

### 焦点与业务行为

三组均不使用彩色阴影，入口、确认与取消的按压缩放均为 0.99。打开聚焦取消，主动取消后恢复入口焦点，均 preventScroll；Escape 取消，滚动保持展开，退场禁用。业务确认及防重复提交留在调用方。

- 退出登录：初始由完整覆盖按钮承接点击，展开后隐藏入口，两侧独立操作。外部轻点抬起取消，移动超过 8px、滚动或取消手势保持展开。请求时禁用，右侧“正在退出…”通过 openContentKey 交叉切换，失败保留确认供重试。
- 详情：左侧蓝色返回渐变为中性底色取消；左侧文字独立于几何进度：每次切换先用 70ms easeInOut 淡出旧文字，80ms 后开始 linear 渐入新文字；展开时取消渐入 200ms，合回时返回文字渐入 140ms。两段文字互不重叠，完成时间与公共几何时间线一致。中途反向停止旧动画及等待，从当前透明度接续；退场停止自身文字动画，减少动态效果立即切换。右侧底色在几何进度 0–60% 从 detail-delete-entry-surface 加深为 destructive-surface，居中垃圾桶淡出，白色“确认删除”淡入，无图标占位。每条记录独立挂载，离开不保留确认。
- 批量：160px 容器预留左侧空间，不推已选数量；右侧原有完整点击区域和中心全程不变。取消右偏移 52→84px，从右侧按钮下方移出；背景固定 neutral-control-surface，仅淡入淡出，文字不与背景叠乘透明度。零选择禁用；包括同数量替换在内的改选立即合回，不抢记录焦点，取消保留勾选。

## 导航顺序长按排序

[LongPressReorderItem](../src/components/ui/long-press-reorder-item.tsx) 封装单项长按拖动与手柄；通过 `value`、`handleLabel`、`onReorderEnd` 和 `children` 复用，不依赖导航标签或账号数据。[NavigationOrderEditor](../src/features/account/components/navigation-order-editor.tsx) 管理 Reorder.Group、草稿顺序、第一项首页标记及持久化回调。

- 左侧手柄长按 350ms 激活，激活前移动超过 8px 取消等待；手柄阻止原生右键菜单，激活后阻止触摸滚动。松手、取消及卸载清理等待计时器。
- 平时使用 `muted` 表面与 `shadow-card`；拖动时使用 `reorder-drag-surface`，浅色引用 `card`，深色引用 `neutral-control-surface`（`#484850`），与深色外观选中项共用底色。
- 拖动项浮到 z-index 10，放大 1.02 倍，复用 `shadow-floating`；深色阴影保持 `0 12px 28px rgb(0 0 0 / 0.5)`。排序弹簧保持 stiffness 460、damping 34，不更改拖动和释放动画。

## 修改密码原位展开

### 展开与周边内容

账号密码展开容器用 clip-path 裁切内容，仅顶部向外放宽 4px，容纳首个输入框的聚焦外圈；左右及底部仍在容器边界裁切。该裁切不参与布局，不增加表单高度或间距，收起动画仍按当前高度隐藏下方内容。

`AccountPasswordControls` 保留 ActionTile 标题和钥匙图标，入口不单独按压缩放；`AccountPasswordForm` 复用凭据控件。卡片高度展开/收回均 360ms，曲线分别 `[0.32, 0, 0.2, 1]`、`[0.4, 0, 0.35, 1]`，无回弹；表单原位淡入 220ms、进入延迟 90ms，退出无延迟，可中途重开。

表单高度由账号专属 [useAccountHeightAnimation](../src/features/account/components/use-account-height-animation.ts) 测量并通过原生 WAAPI 执行；表单透明度仍由 Motion 管理。全局注册的整数属性 `--account-password-height` 驱动实际像素高度，避免滚动到底收回时，小数高度与滚动边界取整相互抵消造成文字往返抖动；测量高度向上取整，避免裁切内容。只在开始、结束、内容尺寸变化或打断时读写高度，中途反向先保存当前显示高度再接续，收起完成才解除表单 presence。不支持 WAAPI 或注册属性时回退 Motion 数值插值并取整，减少动态效果立即切换。原生路径减少 JS 逐帧高度写入，实际高度变化仍需浏览器布局，不保证合成线程执行或固定帧率。

外观、导航排序与退出区域保留自然高度和可见性，随密码表单展开向下移动、收回向上移动，不淡出或隐藏，也不预留旧内容高度。展开前保存面板顶部，保持顶部和已有滚动位置；超屏内部滚动，不主动聚焦输入开键盘。密码请求期间下方区域 inert，保持可见。

### 请求与退出

请求时禁用表单、取消、关闭和头像操作，并防重复提交；成功收起，失败保留输入。Escape 优先收回密码表单，取消或成功清除输入焦点。减少动态效果立即切换。

## 头像移除气泡

确认移除与取消按钮在浅色、深色下悬停均保持原底色，保留公共 Button 的按压和键盘焦点反馈。

### 几何

`ConfirmationPopover` 是非模态锚定气泡。宽 192px、padding 10px、边框 1px；按钮宽 170px、至少 44px 高、间距 8px，上方危险确认、下方灰色取消。外圆角 33px = 按钮 22px + 留白 10px + 边框 1px；尖角是 16px 正方形旋转 45°，相对外边框露出 10px，位移计入旋转尺寸和边框。

### WAAPI 动画

气泡、尖角和按钮整体缩放，原点 `50% -10px`，无额外竖向平移。原生 WAAPI 缓动作用于整段进度，关键帧 offset 如下：

| 方向 | 时长 / 曲线 | scale | opacity | offset |
| --- | --- | --- | --- | --- |
| 展开 | 390ms / `[0.22, 0.72, 0.2, 1]` | 0.16、0.27、0.5、0.78、1.018、1 | 0.12、0.32、0.65、0.91、1、1 | 0、0.2、0.42、0.64、0.88、1 |
| 收回 | 210ms / `[0.42, 0, 0.72, 0.35]` | 1、0.96、0.73、0.39、0.16 | 1、1、0.96、0.68、0 | 0、0.2、0.46、0.72、1 |

中途反向先固化当前缩放/透明度，再映射到目标关键帧，首帧连续；每个实例只取消自身动画，完成固化样式后取消动画层，退出完成才卸载。仅显示/退出或减少动态效果变化启动动画，父重渲染与回调更新不重启，完成使用最新回调。

### 焦点与关闭

外部点击或 Escape 收回；Escape 优先于父 Sheet，打开聚焦取消，退场/提交禁用。减少动态效果立即切换，头像提交继续由 AccountDialog 处理。

## 日历受控分页

`HistoryCalendar` 展示，`useCalendarPager` 编排，`calendar-paging.ts` 计算。拖动直接跟手，touch-action: pan-y 保留竖向滚动；水平移动超过 8px 且大于竖向后接管，取消已识别水平 touchmove 的默认动作，不拦截竖向。

- 新横向手势停止旧归位并接管当前姿态，不锁定输入；每轮最多一月。低速松手取最近页，最近约 80ms 速度达 0.65 页/秒时结合位移方向判定；反向可回到跨过边界。
- 归位弹簧刚度 420、阻尼 `2 * sqrt(420)`，初速度来自松手，只沿目标方向保留，并限于 `sqrt(420) * 剩余距离`，防止过冲。时长随距离和速度变化，减少动态效果直接定位。
- 标题跨半页更新，停稳才提交父月份。手势、按钮或外部导航使旧完成回调失效，重渲染不能用旧父月份覆盖运动位置。
- 前后各三个月，最多七页，以初次打开月份为固定原点；六行至少 44px。非当前页 inert / aria-hidden，overflow-clip 避免焦点滚动偏移；最早月份限制见业务规则。
- 拖动产生的点击被拦截，下一次独立点击立即有效；日期点击先定位月份再打开详情。月份按钮和外部导航直接定位，不新增动画。
- 横向滚轮跟随，100ms 无后续输入时归位；尺寸变化或手势取消归位最近页。卸载停止动画/计时器。

## 交互验证重点

自动化测试入口、浏览器与真机验收要求统一维护在 [开发与发布](./development.md#验证)。组件行为和参数以本文件为准；测试通过不能代替真实动画、计算字号、焦点、退出、滚动和移动端手感检查。
