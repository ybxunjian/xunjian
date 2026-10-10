# 开发与发布

## 环境与安装

技术栈约束见 [AGENTS.md](../AGENTS.md)。精确版本及脚本见 [package.json](../package.json)，安装版本以 [package-lock.json](../package-lock.json) 为准。CI 使用 Node.js 22。

```bash
npm ci
npm run dev
```

开发地址为 <http://localhost:3000/>。云端开发目录也是 Git 工作副本；在其他设备获取已推送更新使用 `git pull --ff-only`，先保留本机未提交修改。

## Supabase 初始化

将 [.env.example](../.env.example) 复制为 `.env.local`，填写 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。只有旧 anon key 时可填入后者；不要填写 service_role。未配置时可纯本地运行。

在新数据库按文件名顺序执行 [supabase/migrations/](../supabase/migrations/) 的全部迁移：

| 迁移 | 内容 |
| --- | --- |
| `202608280001_create_inspection_sync.sql` | 巡检记录、草稿与初始 RLS |
| `20260829150903_user_preferences_and_private_avatars.sql` | 偏好、私有 avatars 和访问策略 |
| `20260830040000_session_revocation_realtime.sql` | 会话撤销字段与偏好 Realtime |
| `20260831101013_protect_drafts_and_add_recorded_at.sql` | recorded_at 与草稿条件写入 RPC |
| `20260901043209_revoke_rls_auto_enable_api_execution.sql` | 撤销 API 角色直接执行内部函数的权限 |
| `20260906170915_reliable_inspection_sync.sql` | 整体恢复事务 RPC 与巡检 Realtime |

此表说明仓库初始化顺序，不证明任意生产数据库已经执行。更换项目时核验数据库迁移、RLS、Storage 与 Realtime 配置；数据约定见 [数据与同步](./data-and-sync.md)。

Authentication 保持邮箱注册开启。生产 Site URL 为 `https://ybxunjian.github.io/xunjian/`，Redirect URLs 加入同一完整地址；本地开发按需加入 `http://localhost:3000/`。注册验证与重置邮件都需要正确回到应用。

GitHub 仓库 Actions secrets 配置上述两个环境变量，发布工作流在构建时注入客户端。

## 验证

代码改动执行：

```bash
PAGES_BASE_PATH=/xunjian npm run check
```

PowerShell 使用：

```powershell
$env:PAGES_BASE_PATH='/xunjian'
npm run check
```

`check` 顺序为 lint → `next typegen` 与 `tsc --noEmit` → tests → production build → Service Worker 生成。单独排查可运行 package.json 的 `lint`、`typecheck`、`test`、`build`；构建前保持 Pages basePath。任一步失败都不能算门禁通过。

测试数量以当次完整运行输出为准，不沿用旧发布数字。自动化测试覆盖规则、存储、草稿、队列、映射、备份、偏好、离线身份、PWA 与公共 UI；涉及动画和触摸需要额外浏览器检查。

| 改动领域 | 必查回归 |
| --- | --- |
| 填写与保存 | 重复泵号交换、局部清空/撤销、全表缺项校验、仍然保存、刷新恢复与新建空白草稿 |
| 历史与确认 | 列表/日历进入详情的返回方向；批量改选使确认失效；取消、打断、重复提交、删除及撤销 |
| 两层导航 | 点击、快速反向、按下即动画追踪与甩动、上下偏移和轨道外松手、轨道内竖向手势保持拖动及导航外正常滚动；键盘、吸顶、窄屏、排序与减少动态效果；滑块预览不提前提交业务选择；快速左右甩动仍选择松手最近项，未过中线不额外跳项 |
| 历史菜单生命周期 | 展开、日历/备份箭头、批量管理勾状态下离开并立即切回，恢复列表与收起汉堡；检查出现/消失与形态变换各自时间线、退场 inert、控制台错误及重复 key 警告 |
| 外观 | 默认跟随系统、手动覆盖、刷新首绘、非法/不可用存储、跨标签页更新；浅色/深色 × 普通/高对比度，减少透明/动态效果；巡检、历史/日历/详情/备份、登录/错误、账号改密/气泡/分裂确认和 Toast；文字放大、窄屏与横屏；双向逐帧与快速反向，输入聚焦、确认展开和分裂中途切换，检查同帧换色、文字对比度及过渡保护自动解除 |
| 公共 UI | 所有调用方、实际字号/尺寸、焦点与 Esc、退出禁用、减少动态效果；细节按 [组件文档](./ui-components.md) |
| 同步 | 离线操作后刷新、联网按序补交、并发追加项保留、旧结果拒绝、墓碑不复活、覆盖/恢复撤销 |
| 草稿 | 多设备新旧版本、同毫秒递增、无版本读取、RPC 拒绝、空白草稿同步 |
| 账号 | 导航与头像跨字段并发、头像 URL 失效重试、改密保留当前会话并撤销其他设备 |
| PWA/发布 | `/xunjian` 路径、manifest 与图标、首次在线后断网重开、新缓存安装失败保留旧缓存 |

浏览器模拟与静态检查不能替代 iPhone / Android 真机、微信工具栏伸缩及双设备联机检查。接手时核对 [已知限制和待复现场景](../PROJECT_HANDOFF.md#接手时注意)，不能把旧审计结论直接当作当前事实。

纯文档变更检查链接、路径、参数、差异与源码范围，无需把历史测试/部署写成本轮验证。检查不通过时记录具体失败和验证范围。

## GitHub Pages

[next.config.ts](../next.config.ts) 使用 `output: "export"` 与构建环境的 `PAGES_BASE_PATH`；输出在 `out/`，`npm run start` 不作为该静态站点的预览方式。

- [ci.yml](../.github/workflows/ci.yml)：面向 main 的 PR 或手动触发，执行同一质量门禁。
- [deploy.yml](../.github/workflows/deploy.yml)：main 推送或手动触发，注入 `/xunjian` 基础路径和 Supabase secrets，门禁成功后上传并部署 Pages。

正式地址：<https://ybxunjian.github.io/xunjian/>。发布结果须对应本次推送的提交 SHA，同时确认 build 与 deploy 成功，并核对该地址及静态资源加载；本项目使用 GitHub Pages，不用 Netlify。浏览器保留旧页面时检查刷新与 Service Worker 更新，不用改用户记录来验证上线。
