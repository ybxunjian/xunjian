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
| [ActionTile](../src/components/ui/action-tile.tsx)、[ClearButton](../src/components/ui/clear-button.tsx) | 图标操作行与局部清空 |
| [DirectionalViewTransition](../src/components/ui/directional-view-transition.tsx) | 历史列表、详情、日历、备份切页 |
| [SplitConfirmationButton](../src/components/ui/split-confirmation-button.tsx) | 批量删除、详情删除、退出登录的内容层与分裂动画基础 |
| [ConfirmationPopover](../src/components/ui/confirmation-popover.tsx) | 头像移除锚定气泡、焦点与 WAAPI 生命周期 |
| [SectionHeading](../src/features/inspection/components/section-heading.tsx) | 巡检和汇总内容标题 |
| [InspectionTabs](../src/features/inspection/components/inspection-tabs.tsx)、[BeltTabs](../src/features/inspection/components/belt/belt-tabs.tsx) | 分别维护一级导航与皮带子导航，不合为万能组件 |

组合类名统一用 `src/lib/utils.ts` 的 `cn()`；新增自定义字号变量需同步其 font-size 分组，避免与颜色类合并时丢失字号。

## 尺寸与表单

| 控件 | 当前尺寸和反馈 |
| --- | --- |
| 基础 Button | 默认至少 44px，compact 最少 36px；默认按压 0.97、CSS 200ms。compact 只用于适合的场景 |
| 首页与辅助流程操作 | 首页新建/保存、备份恢复/替换、保存校验的两项操作、验证邮件重发均为 44px 高胶囊；配色与布局由原场景维护 |
| 两层分段导航 | 44px 轨道、4px 内边距、36px 可见项；透明伪元素纵向扩充点击到 44px。外圆角 22px、项圆角 18px，选中样式 CSS 200ms |
| 原生泵号 select | 108px 宽、当前盒高 44px，焦点过渡 180ms |
| TextField 邮箱/密码 | 最小 52px、字体 16px，胶囊；普通错误区另预留 24px，带忘记密码操作行最小 44px |
| 认证提交按钮 | 登录、注册、发送恢复邮件及恢复页保存密码最小 48px、字体 16px |
| 账号改密取消/保存 | 44px 胶囊、8px 间距、按压 0.99；取消白底深字、无边框，保存蓝底白字 |
| 历史详情入口 | 可见浅色圆形 34px、点击区域 44px、箭头 18px |
| 历史菜单 | 切换 SVG 28px、功能 Lucide 21px，均保留 44×44px 点击范围；切换按压 0.92，功能项不缩放 |

两层导航分别使用 `aria-current` 和 `aria-pressed`，主导航蓝色选中，子导航白色选中。历史菜单功能项为透明 ghost，无圆背景、边框、阴影、悬停底色或悬停说明；无障碍名称仍保留。

认证间距由 globals.css 的 credential/auth 变量维护：普通输入边缘间距 30px（含 24px 错误区），普通末框到提交按钮 41px。Logo 到标题 19px、标题到说明 11px、标题说明区域到表单 22px、提交到切换区 15px。账号密码框复用同一字段间距；字体和横向留白不随控件高度缩放。

`PasswordField` 只切换原生 `password` / `text`，不使用 CSS 密码遮罩。`TextField` 关联 label、aria-invalid、aria-describedby 和错误 alert；`useFieldFeedback` 的 report 递增错误字段抖动序号，输入时 clear，模式切换时 reset。`field-shake` 在全局定义一次：360ms ease-out，横向位移 0、−6、6、−4、4、0；CSS 减少动态效果规则压缩它。

历史卡片至少 88px 高。日期 22px / 700，日期辅助行 11px；填写时分 15px / 600，说明 11px。两列使用共享网格和基线，填写时分上移 3px；辅助行独立对齐。完整时间保留在 title 和辅助朗读中。

## Sheet 与页面切换

`Sheet` 在调用方的 AnimatePresence 内使用，labelledBy 对应实际标题，busy 与业务按钮 disabled 配合。公共组件管理弹层栈、整页滚动锁定、顶层焦点与 Escape；非顶层和退场面板 inert / aria-hidden。开始退出清除内部焦点，关闭后不主动恢复入口焦点。保存校验退出时遮罩不拦截页面点击。

面板外圆角 26px、内容留白 16px，保存校验的整宽状态块圆角 10px，保持内外平行轮廓。面板位移 40px，弹簧刚度 420、阻尼 34；遮罩用 Motion 默认 tween。减少动态效果时立即切换。普通面板最高 `100svh - 2rem`，内部滚动；账号密码展开可按记录的 topOffset 锚定顶部。

一级板块在 `NightInspectionApp` 使用 mode="wait"，旧页上移 6px / 180ms 淡出，新页从下方 8px / 180ms 淡入；当前未完整接入减少动态效果。

历史内部由 `DirectionalViewTransition` 统一：前进 direction=1，返回 −1；mode="wait"，每段 180ms，曲线 `[0.22, 1, 0.36, 1]`。前进旧页向左 14px 退出、新页从右 18px 进入；返回旧页向右 18px 退出、新页从左 18px 进入。首次挂载不播放，减少动态效果立即切换；容器 overflow-x: clip，保留整页竖向滚动。

详情底部操作栏在切页 transform 容器外 fixed，保持视口与 Safe Area 定位。入场 y=10px、出场 y=8px，时长/曲线复用历史切页；入场延迟 180ms，退场无延迟，减少动态效果立即切换。批量栏在列表内 sticky，仅实际吸底时显示顶部 32px 渐隐；短列表正常排在最后卡片后，减少透明效果时使用实色。

## 历史菜单

实现为 `HistoryQuickMenu`，通过 Portal 位于一级动画外的静态容器，层级低于吸顶主导航。根容器 overflow-anchor: none，只排除菜单子树，避免 SVG 线条变形引发浏览器滚动补偿。

一次操作由最终页面/模式状态触发动画。切换到其他主导航或进入详情使用 `data-history-menu-transition="exit"`，外部 pointerdown 忽略此标记，避免先普通收起、再退出。普通外部点击、叉号和 Escape 按正常逻辑收起；日历、备份、批量、返回和完成保留各自目标图标。

| 部分 | 当前时间线 |
| --- | --- |
| 功能按钮组 | 240ms，`[0.22, 1, 0.36, 1]`；从右移 24px、scale 0.86、opacity 0 到正常姿态，退出反向 |
| SVG 线条 | 变形、从中心展开、向中心收缩均 300ms，同一曲线 |
| 中线 pathLength / opacity | 200ms；形成左箭头时延迟 80ms |

叉号退出直接向中心收缩并淡出，不先变三横线；返回列表从中心展开成三横线。叉到左箭头保留斜线方向，向箭尖折合，横线随后伸出。退场由 isPresent 禁用，减少动态效果直接切换。菜单 AnimatePresence 仅在未选详情时 propagate，空菜单不参与一级导航退出等待。

## 公共分裂确认

`SplitConfirmationButton` 复用 Button。关闭/打开内容采用固定绝对居中层交叉淡入淡出，不测量、裁切或缩放文字；调用方提供当前 aria-label，视觉层 aria-hidden。

公共几何参数：展开 280ms、`[0.25, 0.1, 0.25, 1]`；合回 220ms、`[0.25, 0.1, 0.35, 1]`。文字同等时长 easeInOut，无延迟。`getSplitConfirmationTransition` 提供统一参数；`useSplitConfirmationMotion` 在打断后从当前进度接续，清理停止自身动画，退场不重新启动。需要渐变的调用方用 `useSplitConfirmationColor` 解析语义令牌再插值。减少动态效果立即切换。

| 调用方 | 默认 → 确认布局和配色 |
| --- | --- |
| `AccountSignOutControls` | 完整 44px 高红胶囊 → 两个等宽胶囊，各从原 50% 减 4px，中缝 8px，内圆角从 0 到 22px；取消 muted 灰底灰字，确认红底白字 |
| `DetailRecordActions` | 48px 高蓝色返回胶囊 + 48px 浅红删除圆形 → 白底深字取消 + 红底白字确认删除；两侧各占 `(100% - 8px)/2`，保持 8px 间距 |
| `BatchDeleteControls` | 76×44px 红色“垃圾桶＋删除” → 原尺寸原位置红色“确认” + 左侧 76×44px 白底深字取消，间距 8px |

三组均不使用彩色阴影。打开聚焦取消，主动取消后恢复入口焦点，均 preventScroll；Escape 取消，滚动保持展开，退场禁用。业务确认及防重复提交留在调用方。

- 退出登录：初始由完整覆盖按钮承接点击，展开后隐藏入口，两侧独立操作；按压 0.99。外部轻点抬起取消，移动超过 8px、滚动或取消手势保持展开。请求时禁用，右侧“正在退出…”通过 openContentKey 交叉切换，失败保留确认供重试。
- 详情：左侧蓝色返回渐变为白底取消；右侧底色在几何进度 0–60% 从 destructive-soft 加深为 destructive，居中垃圾桶淡出，白色“确认删除”淡入，无图标占位。每条记录独立挂载，离开不保留确认。
- 批量：160px 容器预留左侧空间，不推已选数量；右侧原有完整点击区域和中心全程不变。取消右偏移 52→84px，从右侧按钮下方移出；背景固定 card 白色，仅淡入淡出，文字不与背景叠乘透明度，取消按压 0.99。零选择禁用；包括同数量替换在内的改选立即合回，不抢记录焦点，取消保留勾选。

## 修改密码原位展开

`AccountPasswordControls` 保留 ActionTile 标题和钥匙图标，入口不单独按压缩放；`AccountPasswordForm` 复用凭据控件。卡片高度展开/收回均 360ms，曲线分别 `[0.32, 0, 0.2, 1]`、`[0.4, 0, 0.35, 1]`，无回弹；表单原位淡入 220ms、进入延迟 90ms，退出无延迟，可中途重开。

导航排序与退出区域展开时 160ms 淡出并收起，立即 inert；收回时恢复高度，延迟 140ms 淡入 220ms。展开前保存面板顶部与内容高度，保持顶部和已有滚动位置；超屏内部滚动，不主动聚焦输入开键盘。

请求时禁用表单、取消、关闭和头像操作，并防重复提交；成功收起，失败保留输入。Escape 优先收回密码表单，取消或成功清除输入焦点。减少动态效果立即切换。

## 头像移除气泡

`ConfirmationPopover` 是非模态锚定气泡。宽 192px、padding 10px、边框 1px；按钮宽 170px、至少 44px 高、间距 8px，上方危险确认、下方灰色取消。外圆角 33px = 按钮 22px + 留白 10px + 边框 1px；尖角是 16px 正方形旋转 45°，相对外边框露出 10px，位移计入旋转尺寸和边框。

气泡、尖角和按钮整体缩放，原点 `50% -10px`，无额外竖向平移。原生 WAAPI 缓动作用于整段进度，关键帧 offset 如下：

| 方向 | 时长 / 曲线 | scale | opacity | offset |
| --- | --- | --- | --- | --- |
| 展开 | 390ms / `[0.22, 0.72, 0.2, 1]` | 0.16、0.27、0.5、0.78、1.018、1 | 0.12、0.32、0.65、0.91、1、1 | 0、0.2、0.42、0.64、0.88、1 |
| 收回 | 210ms / `[0.42, 0, 0.72, 0.35]` | 1、0.96、0.73、0.39、0.16 | 1、1、0.96、0.68、0 | 0、0.2、0.46、0.72、1 |

中途反向先固化当前缩放/透明度，再映射到目标关键帧，首帧连续；每个实例只取消自身动画，完成固化样式后取消动画层，退出完成才卸载。仅显示/退出或减少动态效果变化启动动画，父重渲染与回调更新不重启，完成使用最新回调。

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

公共 UI 的语义由 tests/shared-ui.test.mjs 等测试覆盖，真实动画、计算字号、焦点、退出和滚动还需浏览器检查；整体校验流程见 [开发与发布](./development.md#验证)。

菜单检查导航附近滚动、展开状态进入详情、从空菜单切走；三处分裂控件检查动画中途反向、请求失败和减少动态效果，批量检查原点再次点击与同数量改选。

日历覆盖 Chromium 与 WebKit 双向连续十二页、第三页前停顿、约 90% 到位时接管、反向、快滑后点击、键盘、滚轮、竖向滚动、边界/跨年和尺寸变化。停稳后标题、日期页、父月份一致，最多七页，不自行翻月。自动化不代替真机手感验收。
