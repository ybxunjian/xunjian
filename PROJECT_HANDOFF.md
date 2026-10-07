# 项目交接

核对日期：2026-10-07。本文只提供接手入口；完整文档索引见 [README](./README.md#文档入口与职责)。

## 接手顺序

1. 阅读 [AGENTS.md](./AGENTS.md) 和 [治理约定](./GOVERNANCE.md)。
2. 根据任务阅读 [架构](./ARCHITECTURE.md)、[业务规则](./docs/inspection-rules.md)、[数据与同步](./docs/data-and-sync.md) 或 [设计规范](./DESIGN.md)。
3. 涉及交互时阅读 [公共 UI 与交互](./docs/ui-components.md)，涉及环境或上线时阅读 [开发与发布](./docs/development.md)。
4. 用当前源码和 `git status` 确认工作副本状态；文档中的核对日期不代表新的测试或部署结果。

## 当前产品形态

- 手机端巡检 PWA，保留 Next.js App Router 静态导出、本地优先数据和可选 Supabase 账号同步。
- 主导航提供两处冲渣、皮带和历史；导航顺序可按账号保存，第一项为启动页面。
- 历史内提供列表、详情、日历和备份页面；详情删除与批量删除都在按钮原位确认，并支持完成提示中的撤销。
- 账号面板内修改密码原位展开；头像移除使用锚定气泡，退出登录使用分裂确认按钮。
- 批量删除、详情删除和退出登录复用公共分裂组件，各自保留布局与业务策略。批量取消全程白底。

这些是当前功能入口摘要，尺寸、时间线、数据规则分别维护在对应专题文档。

## 代码定位

| 任务 | 首先查看 |
| --- | --- |
| 路由与应用接线 | [page.tsx](./src/app/page.tsx)、[night-inspection-app.tsx](./src/features/inspection/components/night-inspection-app.tsx) |
| 设备与校验 | `src/features/inspection/model/` |
| 草稿、并发和同步状态 | [use-inspection-controller.ts](./src/features/inspection/hooks/use-inspection-controller.ts) |
| 保存、选择、删除与撤销 | [use-inspection-history.ts](./src/features/inspection/hooks/use-inspection-history.ts) |
| 导入、导出与恢复撤销 | [use-inspection-backup.ts](./src/features/inspection/hooks/use-inspection-backup.ts) |
| 历史菜单、日历与详情 | `src/features/inspection/components/history/`、[use-calendar-pager.ts](./src/features/inspection/hooks/use-calendar-pager.ts) |
| 账号设置与头像 | `src/features/account/` |
| 登录、密码恢复与会话 | `src/features/auth/` |
| 通用样式与交互 | `src/components/ui/`、[globals.css](./src/app/globals.css) |

## 接手时注意

- 数据兼容读取、隐藏的泵状态字段、持久化队列、墓碑和 RPC 回退仍有运行时用途，不能作为“旧代码”直接删除。
- 两层切页复用公共组件，菜单独立退场，详情底栏在动画祖先外定位；时间线、滚动恢复和减少动态效果约定见 [公共 UI 与交互](./docs/ui-components.md#sheet-与页面切换)。快速连续导航及真机偏移需按当前版本复现，不能沿用旧审计的根因结论。
- 浏览器自动化不能证明 iPhone 微信工具栏伸缩、真实多设备同步和移动端手感已完成验收；检查范围见开发文档。
- APK 包装、第二套 UI 系统及独立状态库不属于当前实现。

## 新对话提示

```text
继续开发夜班巡检仓库 https://github.com/ybxunjian/xunjian。
先读 AGENTS.md、PROJECT_HANDOFF.md，并按 README 文档索引阅读相关专题。
以当前源码核对需求，保留数据兼容和现有技术栈，再执行本轮修改。
```
