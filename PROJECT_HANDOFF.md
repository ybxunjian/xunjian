# 项目交接

文档按当前源码梳理于 2026-10-27。本文用于接手定位，不记录测试或部署结论；完整索引见 [README](./README.md#文档入口与职责)。

## 接手顺序

1. 阅读 [AGENTS.md](./AGENTS.md)、[维护约定](./GOVERNANCE.md)和[架构](./ARCHITECTURE.md)。
2. 检查工作区、分支和远端，确认已有改动。
3. 按任务阅读业务、数据、UI 或发布专题，以源码核对需求。
4. 完成修改后执行对应验证并更新所属文档。

## 核心入口

| 工作内容 | 首先查看 |
| --- | --- |
| 路由与认证分流 | [page.tsx](./src/app/page.tsx)、[night-inspection-app.tsx](./src/features/inspection/components/night-inspection-app.tsx) |
| 页面和账号组合 | [inspection-app-content.tsx](./src/features/inspection/components/inspection-app-content.tsx) |
| 设备与校验 | [config.ts](./src/features/inspection/model/config.ts)、[field-rules.ts](./src/features/inspection/model/field-rules.ts)、[validation.ts](./src/features/inspection/model/validation.ts) |
| 草稿与同步 | [use-inspection-controller.ts](./src/features/inspection/hooks/use-inspection-controller.ts)、inspection 的 storage / sync 目录 |
| 历史与备份 | [use-inspection-history.ts](./src/features/inspection/hooks/use-inspection-history.ts)、[use-inspection-backup.ts](./src/features/inspection/hooks/use-inspection-backup.ts) |
| 认证与账号偏好 | auth / account 的 hooks、storage、sync 目录；职责见[架构](./ARCHITECTURE.md) |
| 公共交互与样式 | src/components/ui、[globals.css](./src/app/globals.css)；契约见[公共 UI](./docs/ui-components.md) |
| 品牌与分享 | [品牌资源](./design/brand/README.md) |
| 测试与发布 | [开发与发布](./docs/development.md) |

## 接手时注意

- 应用静态导出；本地、账号和离线恢复模式见[架构](./ARCHITECTURE.md#运行模式与部署边界)。
- 本地数据兼容、队列、墓碑和 RPC 回退仍有用途，不能因品牌改名或界面删除而移除；见[数据与同步](./docs/data-and-sync.md)。
- 导航、菜单、弹层和确认动画需要覆盖中途打断、退场及减少动态效果。
- 仓库迁移文件不证明生产数据库已应用；自动化通过也不证明微信真机、多设备同步或移动端手感已验收。

## 新对话提示

```text
继续维护云速巡检：https://github.com/ybxunjian/xunjian
先读 AGENTS.md、PROJECT_HANDOFF.md 和 README 文档索引。
以当前代码确认需求和已有改动，保留数据兼容与既有技术栈，执行相关验证。
```
