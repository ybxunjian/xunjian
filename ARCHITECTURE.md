# 项目架构

项目采用 Next.js App Router、React、TypeScript 和按业务组织的模块化结构。技术栈约束见 [AGENTS.md](./AGENTS.md)。

## 运行模式与部署边界

应用通过 `output: "export"` 静态导出到 GitHub Pages。认证、交互、本地存储及云端请求在浏览器执行；云数据访问由 Supabase 客户端和数据库 RPC 承担。

| 模式 | 行为 |
| --- | --- |
| 本地 | Supabase URL 或公开 key 缺失时直接进入巡检，使用本机数据，无账号面板 |
| 账号 | 完整配置后检查会话，未登录进入认证页，已登录按账号 ID 隔离巡检与偏好生命周期 |
| 离线恢复 | 使用缓存身份恢复对应账号的本机数据；身份缓存不授予云端权限 |
| 密码恢复 | 邮件恢复进入认证流程，更新成功后回到巡检 |

## 目录与边界

| 目录 | 职责 |
| --- | --- |
| src/app | 路由、布局、元数据、全局令牌和 Service Worker 注册 |
| src/components/ui | 跨业务控件与交互基础，不依赖 features |
| src/features/inspection | 巡检、草稿、历史、备份和同步 |
| src/features/auth | 登录、注册、密码恢复、会话和离线身份 |
| src/features/account | 账号面板、头像、导航偏好及其持久化 |
| src/hooks / src/lib | 跨业务浏览器订阅、通用工具、外观和 Supabase 客户端 |
| public / src/assets / design | 静态生产资源、独立品牌导出和设计源稿；用途见[品牌文档](./design/brand/README.md) |
| scripts | 静态导出后的 Service Worker 生成 |
| supabase/migrations | 数据库、权限、Storage 和 Realtime 迁移 |
| tests | 纯规则、控制器和组件回归；不被运行时代码导入 |

业务模块按职责分为 components、hooks、model、storage 和 sync：

- page.tsx 保持 Server Component，浏览器状态与副作用放在客户端功能入口；不因局部交互将整条路由改为客户端组件。
- components 负责展示与事件接线；hooks 编排流程和副作用。
- model 处理纯规则，不依赖 React、DOM、动画和 localStorage。
- storage 管理本机格式、读取与兼容；sync 管理队列和网络策略。
- 对外入口使用 feature 的 index.ts，业务内部引用具体模块。
- 公共 UI 不反向引用业务；lib 不承接设备规则或业务流程。

## 应用组合

```text
page.tsx
└─ NightInspectionApp：认证分流、账号隔离
   ├─ AuthScreen：认证
   └─ InspectionAppContent：巡检与账号编排
      ├─ InspectionHeader / InspectionTabs
      ├─ PumpArea / BeltArea / HistoryView
      └─ AccountDialog / SaveValidationDialog
```

一级页面即时切换；历史子页面使用公共 DirectionalViewTransition。历史菜单位于内容外的 Portal，保持独立退场生命周期。弹层、分段导航和分裂确认复用公共 UI；几何参数与交互约定见[公共 UI](./docs/ui-components.md)。

设备外观由 appearance.ts 和 useAppearance 管理，根布局处理首绘，AppearanceRuntime 承载 Sonner；业务只消费 globals.css 语义令牌。外观是设备偏好，不混入账号云偏好。

## 核心扩展位置

| 修改内容 | 实现入口 |
| --- | --- |
| 设备、字段和保存校验 | [config](./src/features/inspection/model/config.ts)、[field-rules](./src/features/inspection/model/field-rules.ts)、[validation](./src/features/inspection/model/validation.ts) |
| 字段编辑、清空、新建 | [use-inspection-draft-actions](./src/features/inspection/hooks/use-inspection-draft-actions.ts)；写入统一进入控制器 applyDraftChange |
| 草稿仲裁 | [draft-reconciliation](./src/features/inspection/model/draft-reconciliation.ts) |
| 同步互斥、修订保护、防抖与重试 | [use-inspection-controller](./src/features/inspection/hooks/use-inspection-controller.ts)；外部事件由 [use-inspection-sync-events](./src/features/inspection/hooks/use-inspection-sync-events.ts) 接入 |
| 保存、删除与撤销 | [use-inspection-history](./src/features/inspection/hooks/use-inspection-history.ts) |
| 备份流程 / 载荷 | [use-inspection-backup](./src/features/inspection/hooks/use-inspection-backup.ts) / [inspection-backup](./src/features/inspection/storage/inspection-backup.ts) |
| 队列 / 云读写 / 行映射 | [inspection-sync-queue](./src/features/inspection/sync/inspection-sync-queue.ts) / [inspection-cloud-sync](./src/features/inspection/sync/inspection-cloud-sync.ts) / [inspection-cloud-mapping](./src/features/inspection/sync/inspection-cloud-mapping.ts) |
| 日历展示与手势 | [HistoryCalendar](./src/features/inspection/components/history/history-calendar.tsx) / [use-calendar-pager](./src/features/inspection/hooks/use-calendar-pager.ts) / [calendar-paging](./src/features/inspection/model/calendar-paging.ts) |
| 账号偏好与头像 | [use-user-preferences](./src/features/account/hooks/use-user-preferences.ts) / account 的 [storage](./src/features/account/storage/) 和 [sync](./src/features/account/sync/) |
| 导航与通用动画 | [components/ui](./src/components/ui/) 的 segmented-navigation、split-confirmation、sheet 等模块 |

稳定业务规则见[业务文档](./docs/inspection-rules.md)，格式与并发约束见[数据与同步](./docs/data-and-sync.md)，修改和删除依据见[维护约定](./GOVERNANCE.md)。
