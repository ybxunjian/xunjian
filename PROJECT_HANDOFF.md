# 项目交接

文档核对日期：2026-10-15。本文只提供接手入口；完整文档索引见 [README](./README.md#文档入口与职责)。

## 接手顺序

1. 阅读 [AGENTS.md](./AGENTS.md) 和 [治理约定](./GOVERNANCE.md)。
2. 根据任务阅读 [架构](./ARCHITECTURE.md)、[业务规则](./docs/inspection-rules.md)、[数据与同步](./docs/data-and-sync.md) 或 [设计规范](./DESIGN.md)。
3. 涉及交互时阅读 [公共 UI 与交互](./docs/ui-components.md)，涉及环境或上线时阅读 [开发与发布](./docs/development.md)。
4. 用当前源码和 `git status` 确认工作副本状态；文档中的核对日期不代表新的测试或部署结果。

## 当前产品形态

| 范围 | 当前形态与详细入口 |
| --- | --- |
| 运行与数据 | 手机端 PWA、静态导出、本地优先，可选 Supabase 账号同步；见 [架构](./ARCHITECTURE.md)与 [数据与同步](./docs/data-and-sync.md) |
| 巡检与历史 | 两处冲渣、三条皮带、历史列表/详情/日历/备份；填写、返回、删除及撤销规则见 [业务规则](./docs/inspection-rules.md) |
| 外观与导航 | 设备本地浅色/深色/跟随系统，账号可保存导航排序；尺寸、滑块、页面与菜单生命周期见 [公共 UI](./docs/ui-components.md) |
| 账号与确认 | 私有头像、原位改密、分裂退出确认与头像锚定气泡；交互见 [公共 UI](./docs/ui-components.md)，认证及头像恢复见 [数据与同步](./docs/data-and-sync.md) |

本文件提供入口，参数、数据规则和验收要求由对应专题维护。文档核对日期不代表测试已重跑、代码已推送或生产环境已部署。

## 代码定位

| 任务 | 首先查看 |
| --- | --- |
| 路由、认证分流与应用接线 | [page.tsx](./src/app/page.tsx)、[night-inspection-app.tsx](./src/features/inspection/components/night-inspection-app.tsx)、[inspection-app-content.tsx](./src/features/inspection/components/inspection-app-content.tsx)；页头展示见 [inspection-header.tsx](./src/features/inspection/components/inspection-header.tsx) |
| 设备与校验 | `src/features/inspection/model/` |
| 草稿、并发和同步状态 | [use-inspection-controller.ts](./src/features/inspection/hooks/use-inspection-controller.ts) |
| 保存、选择、删除与撤销 | [use-inspection-history.ts](./src/features/inspection/hooks/use-inspection-history.ts) |
| 导入、导出与恢复撤销 | [use-inspection-backup.ts](./src/features/inspection/hooks/use-inspection-backup.ts) |
| 两层导航滑块与手势 | [segmented-navigation-controller.ts](./src/components/ui/segmented-navigation-controller.ts)、[segmented-navigation-motion.ts](./src/components/ui/segmented-navigation-motion.ts)；业务包装见 InspectionTabs / BeltTabs |
| 详情与批量分裂动画 | [split-confirmation-button.tsx](./src/components/ui/split-confirmation-button.tsx)、[use-native-style-transition.ts](./src/components/ui/use-native-style-transition.ts)；参数与业务边界见 [公共分裂确认](./docs/ui-components.md#公共分裂确认) |
| 改密展开与下方内容位移 | [use-account-height-animation.ts](./src/features/account/components/use-account-height-animation.ts)；交互见 [修改密码原位展开](./docs/ui-components.md#修改密码原位展开) |
| 历史菜单、日历与详情 | `src/features/inspection/components/history/`、[use-calendar-pager.ts](./src/features/inspection/hooks/use-calendar-pager.ts) |
| 账号设置与头像 | `src/features/account/` |
| 登录、密码恢复与会话 | `src/features/auth/` |
| 外观与主题事件 | [appearance.ts](./src/lib/appearance.ts)、[use-appearance.ts](./src/hooks/use-appearance.ts)、[appearance-runtime.tsx](./src/app/appearance-runtime.tsx) |
| 通用样式与交互 | `src/components/ui/`、[globals.css](./src/app/globals.css) |
| 自动化与验收 | `tests/`、`tests/helpers/`；测试入口和验证范围见 [开发与发布](./docs/development.md#验证) |

## 接手时注意

- 数据兼容读取、旧巡检字段保留、持久化队列、墓碑和 RPC 回退仍有运行时用途，不能作为“旧代码”直接删除；字段兼容规则见[数据与同步](./docs/data-and-sync.md#兼容读取)。
- 修改导航、历史菜单或 presence 逻辑后，按 [验证要求](./docs/development.md#浏览器与真机回归)检查快速反向、拖动和菜单重入；不能沿用旧审计的根因结论。
- 浏览器自动化不能证明 iPhone 微信工具栏伸缩、真实多设备同步和移动端手感已完成验收；检查范围见开发文档。
- APK 包装、第二套 UI 系统及独立状态库不属于当前实现。

## 新对话提示

```text
继续开发云速巡检仓库 https://github.com/ybxunjian/xunjian。
先读 AGENTS.md、PROJECT_HANDOFF.md，并按 README 文档索引阅读相关专题。
以当前源码核对需求，保留数据兼容和现有技术栈，再执行本轮修改。
```
