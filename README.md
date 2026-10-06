# 夜班巡检

面向手机现场填写的巡检 PWA，支持 8#冲渣、SZ101 / SZ201 / SZ201-N 皮带、9#冲渣，以及历史汇总、巡检日历、删除撤销和 JSON 备份恢复。

数据先保存到当前浏览器。配置 Supabase 后提供邮箱账号、私有头像、导航排序和跨设备同步；未配置时可纯本地使用。首次访问需要网络，离线资源和本地数据依赖浏览器保留站点数据。

正式网站：<https://ybxunjian.github.io/xunjian/>

仓库：<https://github.com/ybxunjian/xunjian>

## 开始开发

使用 Node.js 22，在仓库根目录执行：

```bash
npm ci
npm run dev
```

打开 <http://localhost:3000/>。`package-lock.json` 是已提交的依赖锁文件；按现有版本安装，无需更新依赖。

Supabase 环境变量、数据库初始化、质量门禁与 GitHub Pages 发布步骤见 [开发与发布](./docs/development.md)。推送 `main` 会触发正式发布。

## 文档入口与职责

每类规则只在对应文档维护，其他文档通过链接引用。文档与源码不一致时先核对当前实现及明确需求，再纠正文档；不要根据旧截图或历史提交恢复已经替换的实现。

| 需要了解的内容 | 唯一维护入口 |
| --- | --- |
| 新对话接手、重点代码入口 | [项目交接](./PROJECT_HANDOFF.md) |
| 开发代理必须遵守的约束 | [AGENTS.md](./AGENTS.md)；`CLAUDE.md` 引用同一文件 |
| 修改边界、清理依据、文档维护 | [治理约定](./GOVERNANCE.md) |
| 模块职责、依赖方向和扩展位置 | [架构](./ARCHITECTURE.md) |
| 设备、填写、保存、历史和备份规则 | [巡检业务规则](./docs/inspection-rules.md) |
| 数据格式、兼容读取、同步与账号隔离 | [数据与同步](./docs/data-and-sync.md) |
| 视觉语言、设计令牌和层级 | [设计规范](./DESIGN.md) |
| 公共组件、尺寸、动画参数和交互 | [公共 UI 与交互](./docs/ui-components.md) |
| 环境、迁移、校验与发布 | [开发与发布](./docs/development.md) |
| 品牌母版、图标导出和验收 | [品牌资源](./design/brand/README.md) |

## 运行入口

[src/app/page.tsx](./src/app/page.tsx) 保持路由入口；客户端应用由 [NightInspectionApp](./src/features/inspection/components/night-inspection-app.tsx) 组合巡检、认证和账号功能。

业务代码在 `src/features/`，通用控件在 `src/components/ui/`，设计令牌在 `src/app/globals.css`。更完整的职责划分见架构文档。历史实施过程由 Git 历史保存，不作为现行规范重复维护。
