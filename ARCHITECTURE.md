# 项目架构

项目使用 Next.js App Router 和按业务功能组织的模块化单体结构。路由、展示、流程编排、纯规则、存储和网络读写分别承担独立职责。

## 目录与边界

| 目录 | 职责 |
| --- | --- |
| `src/app/` | 路由、布局、元数据、全局令牌和 Service Worker 注册 |
| `src/components/ui/` | 跨业务控件与交互基础，不依赖 `features` |
| `src/features/inspection/components/` | 巡检展示，按泵区、皮带、历史、保存校验拆分 |
| `src/features/inspection/hooks/` | 草稿和同步、历史操作、备份、日历手势的流程编排 |
| `src/features/inspection/model/` | 设备配置、字段、校验、时间、草稿仲裁和分页纯规则 |
| `src/features/inspection/storage/` | 巡检本地读写、账号缓存切换、备份格式与归一化 |
| `src/features/inspection/sync/` | 云端读写、行映射和持久化历史操作队列 |
| `src/features/auth/` | 认证表单、会话、密码恢复和离线身份 |
| `src/features/account/` | 账号面板、头像、导航偏好及独立存储和同步 |
| `src/lib/` | 通用工具与浏览器 Supabase 客户端 |
| `scripts/` | 静态导出后的 Service Worker 生成 |
| `supabase/migrations/` | 数据库、权限、Storage 和 Realtime 初始化 |

`src/assets/` 的透明品牌导出用于核对，当前运行时不加载；生产图标和设计源稿由 [品牌文档](./design/brand/README.md) 说明。

## 依赖规则

- `src/app/page.tsx` 保持 Server Component，交给客户端 `NightInspectionApp` 组合 inspection、auth 和 account 的公开入口。
- 业务组件调用自己的 hook 和 model；纯 `model` 不依赖 React、DOM、动画或 localStorage。
- 巡检 localStorage 键由 `inspection-storage.ts` 管理；历史队列、认证身份、账号偏好由各自专属模块管理，不把所有浏览器存储混入一个文件。
- `components/ui` 可以被各 feature 使用，不能反向引用业务模块。业务内部直接引用具体文件，对外使用各 feature 的 `index.ts`。
- `lib` 不承接设备规则或业务流程；网络策略不放入只负责载荷转换的 model 或 mapping 模块。

## 流程扩展位置

| 改动内容 | 实现位置与职责 |
| --- | --- |
| 设备、字段及完整性校验 | `model/config.ts`、`field-rules.ts`、`validation.ts` |
| 草稿冲突与版本递增 | `model/draft-reconciliation.ts`；控制器只编排使用 |
| 同步并发 | `use-inspection-controller.ts` 持有修订号、互斥、补跑、防抖、退避和状态 |
| 外部同步事件 | `use-inspection-sync-events.ts` 注册和清理 online、前台与 Realtime，回调进入控制器的同一同步入口 |
| 保存和删除 | `use-inspection-history.ts` 处理本地提交、选择状态、云端操作和撤销 |
| 备份 | `use-inspection-backup.ts` 编排；`storage/inspection-backup.ts` 处理解析、去重和排序 |
| 队列与网络 | `inspection-sync-queue.ts` 管理持久化项；`inspection-cloud-sync.ts` 决定新增、删除、恢复和 RPC 策略 |
| 数据库载荷 | `inspection-cloud-mapping.ts` 做行校验与转换，领域载荷校验复用 `model/validation.ts` |
| 日历 | `HistoryCalendar` 展示；`use-calendar-pager.ts` 管理手势与运动；`calendar-paging.ts` 计算目标和速度限制 |
| 偏好与头像 | `use-user-preferences.ts` 编排字段并发和恢复；`prepare-avatar.ts` 处理图片；`navigation-order-editor.tsx` 管理排序草稿和拖动 |

数据格式、迁移兼容和完整同步流程只在 [数据与同步](./docs/data-and-sync.md) 维护。

## 外观

`src/lib/appearance.ts` 独立管理设备本地主题偏好与浏览器外观事件，`src/hooks/use-appearance.ts` 提供 React 外部快照订阅。根布局在内容首绘前解析偏好，常驻 AppearanceRuntime 保持 Toast 和 theme-color 一致；账号面板调用公共 AppearancePicker。业务组件只消费语义令牌，颜色解析集中在 globals.css，不将主题状态混入巡检数据或用户云偏好。

## UI 组合

- `InspectionTabs` 与 `BeltTabs` 保留各自布局、语义和选择回调，共用 `segmented-navigation-controller.ts` 的滑块与手势实现，以及 `segmented-navigation-motion.ts` 的弹簧参数；控制器不持有业务页面或存储状态。
- `NightInspectionApp` 即时切换一级内容；退出内容立即 hidden / inert，保留 presence 生命周期供 Portal 菜单独立退场。
- `HistoryView` 用公共 `DirectionalViewTransition` 切换列表、详情、日历和备份；详情底部操作栏在切页 transform 容器外定位。
- `HistoryQuickMenu` 通过 Portal 放入一级内容外的静态容器，菜单形态由最终页面状态驱动。`HistoryView` 在退出时移除菜单的实时子节点，由 AnimatePresence 保留唯一退场快照；快速重入重置历史子页面与菜单展开状态。
- 公共 `SplitConfirmationButton` 统一内容层和动画基础。批量删除、详情删除、退出登录的几何布局、焦点策略和提交仍留在对应业务控件。
- 公共 `Sheet` 管理弹层栈、滚动锁定、焦点及退出禁用；账号内密码展开由 `AccountPasswordControls` 与 `AccountPasswordForm` 管理。
- 公共 `ConfirmationPopover` 管理气泡和自身 WAAPI 生命周期，头像请求由 `AccountDialog` 执行。WAAPI 是浏览器能力，不增加动画依赖。

控件参数和调用约定见 [公共 UI 与交互](./docs/ui-components.md)，视觉原则见 [设计规范](./DESIGN.md)，修改和清理要求见 [治理约定](./GOVERNANCE.md)。
