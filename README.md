# 云速巡检

面向手机现场的巡检 PWA，覆盖 8#冲渣、9#冲渣、SZ101 / SZ201 / SZ201-N 皮带，以及历史查看、巡检日历和 JSON 备份恢复。

数据本地优先，可选 Supabase 邮箱认证与跨设备同步。项目静态导出到 GitHub Pages，支持安装和离线使用。

- 正式网站：<https://ybxunjian.github.io/xunjian/>
- 代码仓库：<https://github.com/ybxunjian/xunjian>

## 快速开始

使用 Node.js 22：

```bash
npm ci
npm run dev
```

打开 <http://localhost:3000/>。依赖按已提交的锁文件安装；环境配置、完整校验和部署见[开发与发布](./docs/development.md)。

## 文档入口与职责

| 文档 | 阅读目的 |
| --- | --- |
| [项目交接](./PROJECT_HANDOFF.md) | 快速接手、定位代码和风险边界 |
| [AGENTS.md](./AGENTS.md) | 开发代理约束；CLAUDE.md 引用同一文件 |
| [维护约定](./GOVERNANCE.md) | 修改范围、删除依据和文档维护规则 |
| [项目架构](./ARCHITECTURE.md) | 运行方式、模块职责和扩展位置 |
| [业务规则](./docs/inspection-rules.md) | 设备范围、填写、保存、历史和备份行为 |
| [数据与同步](./docs/data-and-sync.md) | 数据格式、存储、冲突处理、账号隔离和兼容性 |
| [设计规范](./DESIGN.md) | 视觉语言、令牌、主题和信息层级 |
| [公共 UI](./docs/ui-components.md) | 组件复用、关键布局与动画契约 |
| [开发与发布](./docs/development.md) | 环境、迁移、校验和 GitHub Pages 发布 |
| [品牌资源](./design/brand/README.md) | 品牌名、图形源稿、图标和分享图维护 |

接手先读交接、代理约束和架构，再按任务阅读专题。每类规则只有一个维护入口，其他文档通过链接引用；文档与源码不一致时核对当前实现，不按历史截图恢复旧方案。
