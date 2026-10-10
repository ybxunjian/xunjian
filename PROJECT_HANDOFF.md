# 项目交接

核对日期：2026-10-10。本文只提供接手入口；完整文档索引见 [README](./README.md#文档入口与职责)。

## 接手顺序

1. 阅读 [AGENTS.md](./AGENTS.md) 和 [治理约定](./GOVERNANCE.md)。
2. 根据任务阅读 [架构](./ARCHITECTURE.md)、[业务规则](./docs/inspection-rules.md)、[数据与同步](./docs/data-and-sync.md) 或 [设计规范](./DESIGN.md)。
3. 涉及交互时阅读 [公共 UI 与交互](./docs/ui-components.md)，涉及环境或上线时阅读 [开发与发布](./docs/development.md)。
4. 用当前源码和 `git status` 确认工作副本状态；文档中的核对日期不代表新的测试或部署结果。

## 当前产品形态

- 支持系统浅深色外观，账号面板提供外观选择；实现入口见 [公共 UI](./docs/ui-components.md#外观基础)。
- 手机端巡检 PWA，保留 Next.js App Router 静态导出、本地优先数据和可选 Supabase 账号同步。
- 主导航提供两处冲渣、皮带和历史；导航顺序可按账号保存，第一项为启动页面。
- 主导航与皮带子导航复用可打断的滑块和按下即动画追踪的拖动交互，松手就近选中；一级内容即时切换，历史内部保留方向切页。
- 历史内提供列表、详情、日历和备份页面；详情删除与批量删除都在按钮原位确认，并支持完成提示中的撤销。
- 快速离开再回到历史时恢复列表和收起的汉堡菜单，不保留展开、日历、备份或批量管理图标形态。
- 账号面板内修改密码原位展开；头像移除使用锚定气泡，退出登录使用分裂确认按钮。
- 批量删除、详情删除和退出登录复用公共分裂组件，各自保留布局与业务策略。批量取消保持同一表面色，仅淡入淡出。

这些是当前功能入口摘要，尺寸、时间线、数据规则分别维护在对应专题文档。

## 代码定位

| 任务 | 首先查看 |
| --- | --- |
| 路由与应用接线 | [page.tsx](./src/app/page.tsx)、[night-inspection-app.tsx](./src/features/inspection/components/night-inspection-app.tsx) |
| 设备与校验 | `src/features/inspection/model/` |
| 草稿、并发和同步状态 | [use-inspection-controller.ts](./src/features/inspection/hooks/use-inspection-controller.ts) |
| 保存、选择、删除与撤销 | [use-inspection-history.ts](./src/features/inspection/hooks/use-inspection-history.ts) |
| 导入、导出与恢复撤销 | [use-inspection-backup.ts](./src/features/inspection/hooks/use-inspection-backup.ts) |
| 两层导航滑块与手势 | [segmented-navigation-controller.ts](./src/components/ui/segmented-navigation-controller.ts)、[segmented-navigation-motion.ts](./src/components/ui/segmented-navigation-motion.ts)；业务包装见 InspectionTabs / BeltTabs |
| 历史菜单、日历与详情 | `src/features/inspection/components/history/`、[use-calendar-pager.ts](./src/features/inspection/hooks/use-calendar-pager.ts) |
| 账号设置与头像 | `src/features/account/` |
| 登录、密码恢复与会话 | `src/features/auth/` |
| 外观与主题事件 | [appearance.ts](./src/lib/appearance.ts)、[use-appearance.ts](./src/hooks/use-appearance.ts)、[appearance-runtime.tsx](./src/app/appearance-runtime.tsx) |
| 通用样式与交互 | `src/components/ui/`、[globals.css](./src/app/globals.css) |

## 接手时注意

- 数据兼容读取、隐藏的泵状态字段、持久化队列、墓碑和 RPC 回退仍有运行时用途，不能作为“旧代码”直接删除。
- 一级内容即时切换；两层滑块和历史菜单均处理减少动态效果，参数及生命周期见 [公共 UI 与交互](./docs/ui-components.md)。修改导航或 presence 逻辑后，按开发文档复查快速反向、拖动和菜单重入，不能沿用旧审计的根因结论。
- 浏览器自动化不能证明 iPhone 微信工具栏伸缩、真实多设备同步和移动端手感已完成验收；检查范围见开发文档。
- APK 包装、第二套 UI 系统及独立状态库不属于当前实现。

## 新对话提示

```text
继续开发夜班巡检仓库 https://github.com/ybxunjian/xunjian。
先读 AGENTS.md、PROJECT_HANDOFF.md，并按 README 文档索引阅读相关专题。
以当前源码核对需求，保留数据兼容和现有技术栈，再执行本轮修改。
```
