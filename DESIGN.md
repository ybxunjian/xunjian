# 设计规范

夜班巡检是面向手机现场填写、核对与回看的 PWA。视觉应直接、克制、清晰，服务快速操作。

## 设计语言

- 浅灰页面、白色圆角卡片、蓝色主操作；危险确认使用红色，辅助信息使用灰色。
- 本地 shadcn/ui 风格组件以 New York 为结构基线，保持项目的 iOS 风格。Material Design 3 只提供交互参考，不引入其视觉主题或 UI 库。
- 主操作与危险操作不使用蓝色或红色投影；卡片、导航、气泡和弹层使用容器阴影表达层级。
- 功能图标用 Lucide。历史菜单的三横线、叉、勾、返回箭头需要连续变形，保留同一组业务 SVG；品牌图形是独立装饰资产。
- 默认跟随系统浅色/深色外观；账号面板可手动选择浅色、深色或跟随系统。偏好只保存在当前设备，不参与账号云同步。主题原则与验证见下文。

## 令牌与布局

唯一界面令牌来源是 [globals.css](./src/app/globals.css)，通过语义 Tailwind 类使用。

| 类别 | 令牌与用途 |
| --- | --- |
| 页面与文字 | `background`、`foreground`、`foreground-strong` |
| 容器与辅助 | `card`、`surface-elevated`、`control-border`、`muted`、`muted-foreground`、`subtle-foreground`、`border` |
| 一级导航 | `navigation-track`、`navigation-selection`、`navigation-foreground`、`navigation-muted`、`navigation-border`；选中块使用 `navigation-selection` |
| 操作与状态 | `primary`、`primary-surface`、`secondary`、`success`、`warning`、`destructive`、`destructive-surface` 及各自前景/弱底色 |
| 圆角 | `radius-small`、`radius-control`、`radius-navigation`、`radius-navigation-item`、`radius-card`、`radius-sheet`、`radius-confirmation-popover` |
| 容器阴影 | `shadow-card`、`shadow-floating` |
| 间距与字号 | 页面/区块、认证表单、历史信息专属变量，以及 `text-label`、`text-caption`、`text-body`、`text-card-title`、`text-title` |

现存彩色阴影变量不代表按钮应恢复彩色投影。不要在业务组件复制新的颜色、圆角或间距体系。

内容以 `max-w-md` 手机宽度为基准，页面水平留白使用 `p-page`。顶部与底部考虑 `env(safe-area-inset-*)`；图标可见尺寸与点击范围分别设计，常规触控目标至少 44px。

嵌套轮廓需要平行时使用“内圆角 = 外圆角 − 内边距”；独立输入框、胶囊按钮和圆形操作使用自身形状，不强套同一公式。具体尺寸维护在组件文档。

## 信息与操作层级

- 首页深色头部承载应用身份、新建、保存和紧凑同步状态，不增加重复账号信息或同步入口。
- 主导航使用浅灰轨道、白色选中块、深色选中文字与灰色未选中文字；皮带子导航保持白底蓝字选中。吸顶时保持导航在内容与管理菜单上方。
- 账号设置集中在账号面板，备份集中在历史页面。删除和退出登录使用原位二次确认，头像移除使用锚定气泡，保存完整性校验使用 Sheet。
- 日期是历史卡片主信息，填写时间降低一级但保持可读。仅改变显示排版，不改真实记录时间。
- 日历有记录的日期使用主文字色加粗；今天保持浅蓝底，有记录也遵循深色加粗，无记录则蓝字不加粗。

## 浅色与深色外观

- 页面只声明语义颜色，不散落浅深色条件；`globals.css` 的 `:root` / `data-theme="dark"` 统一解析颜色。默认跟随 `prefers-color-scheme`，用户保存的是 system/light/dark 偏好，而非系统当前深色布尔值。
- 深色使用页面、卡片、二级内容和抬升表面四类亮度；Sheet、头像气泡和 Toast 使用 `surface-elevated`。卡片层级依靠亮度差与分隔线，阴影仅辅助，不增加蓝/红按钮投影。
- `primary` / `destructive` 用于链接、图标、状态；实色按钮使用 `primary-surface` / `destructive-surface`，配白色前景，避免把适合暗底的亮色直接用作白字按钮底色。
- 浅色保持原有按钮、辅助文字、输入框/下拉边界、placeholder 和 Sonner 配色，不随深色适配加深；浏览器 theme-color 保持原有品牌墨色。新增深色配色的普通文字目标至少 4.5:1，关键图形至少 3:1；浅色既有配色不宣称达到这些目标。深色的 `prefers-contrast: more` 集中增强次级文字、分隔线和控件边界。
- 输入文字、placeholder、原生 select、日历今天/有记录、错误和同步状态使用同一语义体系。状态继续配图标/文字，不能只用红绿区分。
- 登录 Logo 使用独立浅色墨色适配深背景，保留青色品牌渐变与路径；头像、照片、分享图与安装图标保持原图，不全局反色。资源规则见品牌文档。
- 页面首绘前解析主题，刷新避免先出现浅色界面。切换直接更新颜色，不新增全页动画；现有减少动态效果规则继续生效。深色减少透明效果时移除 Sheet 与皮带导航模糊；浅色保留已有规则，历史底部栏在两种外观都使用实色。
- Web 通过 CSS 媒体查询、根属性和浏览器事件实现报告中的动态外观原则，不引入 UIKit/SwiftUI 或第二套组件库。微信和系统自己的工具栏由宿主控制，网页仅能提供 theme-color 提示。

## 状态反馈

- 加载反馈放在操作或内容原位，不阻塞已经可用的内容；使用现有图标/文字或有实际实现的加载占位。
- 空状态用功能图标和简短说明，需要操作时提供明确入口。
- 表单错误在对应字段或表单内展示，保留错误空间与恢复操作；短暂操作结果使用 Sonner 顶部提示。
- 同步文案准确区分本机、同步中、离线、失败、成功与待同步数量，文字以当前组件为准。最近成功时间不代表防抖等待中的草稿已提交。
- 删除完成提示提供撤销；请求中和退出中的操作不得重复提交。

## 动画与品牌

使用现有 Framer Motion，头像气泡使用浏览器 WAAPI。动效需可打断、尊重页面状态和系统减少动态效果；明确指定的时间线不被默认值覆盖。

尺寸、曲线、关键帧、焦点与退场规则只在 [公共 UI 与交互](./docs/ui-components.md) 维护。品牌色、母版路径、透明与白底资源、Maskable 安全圆和导出验收只在 [品牌资源](./design/brand/README.md) 维护。
