# 公共 UI 与交互

本文件维护公共组件的使用契约和关键参数。视觉原则见[设计规范](../DESIGN.md)，业务行为见[业务规则](./inspection-rules.md)，验证见[开发与发布](./development.md#验证)。

## 组件职责

| 实现 | 用途与边界 |
| --- | --- |
| [Button](../src/components/ui/button.tsx)、[Card](../src/components/ui/card.tsx) | 基础操作与容器，通过 variant、size、className 扩展 |
| [TextField](../src/components/ui/text-field.tsx)、[FormError](../src/components/ui/form-error.tsx) | 凭据输入、错误关联和统一反馈 |
| [CredentialForm](../src/features/auth/components/credential-form.tsx)、[PasswordField](../src/features/auth/components/password-field.tsx) | 认证与改密表单复用，业务提交留在调用方 |
| [Sheet](../src/components/ui/sheet.tsx)、[DialogHeading](../src/components/ui/dialog-heading.tsx) | 弹层结构、滚动、焦点与退出管理 |
| [ActionTile](../src/components/ui/action-tile.tsx)、[ClearButton](../src/components/ui/clear-button.tsx) | 图标操作行与局部清空 |
| [SectionHeading](../src/features/inspection/components/section-heading.tsx) | 巡检与历史页面标题 |
| [LongPressReorderItem](../src/components/ui/long-press-reorder-item.tsx) | 单项长按拖动；排序业务由账号模块提交 |
| [DirectionalViewTransition](../src/components/ui/directional-view-transition.tsx) | 历史子页面切换 |
| [SplitConfirmationButton](../src/components/ui/split-confirmation-button.tsx) | 分裂确认内容与动画基础，不持有删除或退出业务 |
| [ConfirmationPopover](../src/components/ui/confirmation-popover.tsx) | 锚定气泡和自身动画生命周期 |

新控件先复用 src/components/ui；同类差异优先用属性或插槽，业务专属组件留在 feature。类名使用 cn，自定义字号需核对合并规则。

## 外观基础

globals.css 是唯一界面令牌来源，按语义区分页面、容器、内层、抬升、操作与确认表面。填充按钮使用 surface 与配对前景，文字强调使用普通语义色；场景专属取消、历史入口和导航令牌不合并为全局按钮覆盖。

appearance.ts 统一首绘、系统主题/对比度和跨标签页订阅；useAppearance 提供快照，AppearanceRuntime 管理 Sonner。主题切换同步换色，保留几何和透明度动画；需要混色的原生动画按当前进度重新解析令牌。

公共 Button 管理基础悬停、按压、禁用和焦点。业务仅覆盖明确场景，不全局重置反馈。数据数字使用 tabular-nums，不扩展到邮箱等普通文本。

[AppearancePicker](../src/components/ui/appearance-picker.tsx) 使用三个独立按钮选择跟随系统、浅色或深色。指针松手完成点击或键盘激活后直接更新偏好和主题，aria-pressed 表达选中状态，选中底色位于对应按钮内。尺寸、过渡和按压反馈复用公共 [Button](../src/components/ui/button.tsx) 默认行为；禁用时三个按钮均不可操作，不接入分段导航的滑块与拖动控制器。

## 基础尺寸

以下为默认根字号下的基准，精确类名以组件源码为准。

| 控件 | 基准 |
| --- | --- |
| 普通 / 图标按钮 | 至少 44px；compact 36px，仅限适合场景 |
| TextField | 最小 52px，16px 输入字体；关联 label、错误和辅助描述 |
| 认证提交 | 最小 48px，胶囊；复用 CredentialForm |
| 分段导航 | 44px 轨道，4px 内边距，36px 可见项，扩展点击到 44px |
| Sheet | 26px 外圆角、16px 内边距；限制视口高度并内部滚动 |
| 历史菜单 | 28px 切换图形、21px 功能图标，44px 点击范围 |
| 历史详情操作 | 48px 高，两侧分裂保持 8px 间距；容器对齐汇总内容 |
| 历史批量操作 | 44px 高；吸底时局部渐进模糊，短列表自然排布 |

独立按钮保持 Safe Area；装饰层不得拦截点击、扩大滚动高度或影响前景清晰度。不支持滤镜/遮罩及减少透明效果时使用现有降级方案。

## 两层导航

InspectionTabs 与 BeltTabs 保留业务语义和布局，公共 [useSegmentedNavigation](../src/components/ui/use-segmented-navigation.ts) 接线，[控制器](../src/components/ui/segmented-navigation-controller.ts)处理手势。

- 按下即捕获指针，滑块由弹簧追赶后混合为直接跟手；高亮跟随预览，业务选择在点击或松手提交。
- 松手按最近位置选择，不按速度额外跳项；取消、失焦、尺寸变化恢复已提交状态。
- 轨道接管从其开始的手势，轨道外保留正常页面滚动；支持方向键、Home、End。
- 主导航与皮带导航分别维护坐标和状态，排序或减少动态效果变化时重建控制器。

选择弹簧为 stiffness 360、damping 36、mass 1；按住放大 1.15，横向拉伸最多 10%。细节计算集中在控制器和 [motion 参数](../src/components/ui/segmented-navigation-motion.ts)，不在调用方复制。

## 页面、菜单与弹层

| 场景 | 当前时间线 / 契约 |
| --- | --- |
| 一级页面 | 即时切换；退场内容 hidden / inert，保留 Portal 菜单的退场生命周期 |
| 历史子页面 | sync 模式；旧页退出 100ms，新页延迟 40ms 后入场 240ms；前进和返回方向相反 |
| 详情操作栏 | 位于正文 transform 外，使用与正文一致的入退场时间线 |
| Sheet | 位移 40px，弹簧 stiffness 420、damping 34；顶层焦点、滚动锁定与 Escape 由公共组件处理 |
| 历史菜单组展开 | 220ms，曲线 [0.25, 0.1, 0.25, 1]；右偏 8px 到原位并淡入 |
| 历史菜单组收起 | 160ms，曲线 [0.4, 0, 1, 1]；右移 8px 并淡出，整组同步 |
| 菜单图形 | 首次出现/退出 340ms，形态变换 300ms，路径曲线 [0.22, 1, 0.36, 1] |
| 菜单中线 | 汉堡变叉时缩短与淡出 60ms；其他状态 200ms，形成左箭头延迟 80ms |

[HistoryQuickMenu](../src/features/inspection/components/history/history-quick-menu.tsx) 通过 Portal 位于一级内容外、吸顶导航下。外部关闭按完成的 click 判断，切页事件由最终状态驱动，避免先收起再退出。退场 inert / aria-hidden，快速重入恢复列表和收起菜单；不可保留同 key 的重复菜单快照。

图形路径与各线透明度独立控制，中线使用归一化 strokeDasharray。形态由最终页面状态驱动，打断、退场和重入统一由现有 presence 生命周期管理。

## 公共分裂确认

公共基础位于 [SplitConfirmationButton](../src/components/ui/split-confirmation-button.tsx)。几何展开 280ms、曲线 [0.25, 0.1, 0.25, 1]；合回 220ms、曲线 [0.25, 0.1, 0.35, 1]。

| 场景 | 业务契约 |
| --- | --- |
| 退出登录 | 原位分为取消与确认；轻点外部取消，请求中防重复；失败保留可重试状态 |
| 详情删除 | 返回/删除分裂为取消/确认，两侧保持 8px；专属宽度、文字交接和颜色参数集中在 detail-record-actions-motion.ts |
| 批量删除 | 右侧确认保持原位置，取消从左侧展开；改选立即合回，取消保留选择 |

打开聚焦取消，主动取消恢复入口焦点；Escape 取消，退场禁用。业务请求留在调用方。详情与批量的原生样式过渡由 [useNativeStyleTransition](../src/components/ui/use-native-style-transition.ts) 管理打断、快照和回退；混色沿用公共进度。

### 取消配色

详情和批量取消使用 neutral-control-surface；退出及移除头像取消使用 secondary-action-surface；改密取消使用 credential-cancel-surface。各自悬停保持原底色，避免覆盖成普通 ghost 反馈。

## 账号交互

| 交互 | 核心约定 |
| --- | --- |
| 导航排序 | 长按 350ms 激活，移动超过 8px 取消等待；拖动结束提交；放大 1.02，弹簧 460/34 |
| 改密展开 | 高度展开/收回均 360ms；表单透明度 220ms，进入延迟 90ms、退出无延迟 |
| 头像移除 | 锚定气泡整体缩放/淡入淡出；展开 390ms，收回 210ms |

### 修改密码原位展开

[useAccountHeightAnimation](../src/features/account/components/use-account-height-animation.ts) 管理实测高度、整数像素动画、打断快照和收起完成回调。下方偏好区保持文档流和可见性；请求期间禁用操作，成功收起，失败保留表单。精确曲线位于 [account-password-motion.ts](../src/features/account/components/account-password-motion.ts)。

### 头像移除气泡

气泡由公共 ConfirmationPopover 管理焦点、外部关闭和自身 WAAPI 生命周期；头像请求留在账号模块。锚定于触发器，整体从顶部缩放，无额外竖向平移；关键帧集中在组件源码。

## 日历与性能边界

日历拖动直接跟手，横向识别后接管，保留竖向滚动；归位弹簧按剩余距离限制速度，每轮手势最多一月。页面窗口最多七页，月份提交、打断与清理由 useCalendarPager 管理。

历史卡片在支持时使用 content-visibility，保留全部 DOM 与数据；不将其当作虚拟列表。原生 transform/opacity 可减少脚本写入，但宽度、高度和位置变化仍可能需要布局，不能据此承诺固定帧率。

所有动画需支持减少动态效果、快速反向与卸载清理。源码参数、自动化检查及浏览器/真机验收各有边界，执行入口见[验证](./development.md#验证)。
