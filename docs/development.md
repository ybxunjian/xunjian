# 开发与发布

本文件维护环境、验证与 GitHub Pages 发布。修改边界见 [治理约定](../GOVERNANCE.md)，业务与组件参数分别维护在对应专题。

## 环境与安装

技术栈约束见 [AGENTS.md](../AGENTS.md)。精确版本及脚本见 [package.json](../package.json)，安装版本以 [package-lock.json](../package-lock.json) 为准。CI 使用 Node.js 22。

```bash
npm ci
npm run dev
```

开发地址为 <http://localhost:3000/>。云端开发目录也是 Git 工作副本；在其他设备获取已推送更新使用 `git pull --ff-only`，先保留本机未提交修改。

## Supabase 初始化

### 客户端配置

将 [.env.example](../.env.example) 复制为 `.env.local`，填写 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。只有旧 anon key 时可填入后者；不要填写 service_role。未配置时可纯本地运行。

### 数据库迁移

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

### 邮件回跳与发布变量

Authentication 保持邮箱注册开启。生产 Site URL 为 `https://ybxunjian.github.io/xunjian/`，Redirect URLs 加入同一完整地址；本地开发按需加入 `http://localhost:3000/`。注册验证与重置邮件都需要正确回到应用。

GitHub 仓库 Actions secrets 配置上述两个环境变量，发布工作流在构建时注入客户端。

## 验证

### 完整质量门禁

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

### 自动化测试

测试数量以当次完整运行输出为准，不沿用旧发布数字。`npm test` 自动发现 `tests/*.test.mjs`；`tests/helpers/` 提供测试辅助代码，不进入运行时。当前入口如下：

| 领域 | 测试入口 |
| --- | --- |
| 设备、字段和保存校验 | [field-rules](../tests/field-rules.test.mjs)、[inspection-validation](../tests/inspection-validation.test.mjs) |
| 历史时间、筛选和日历目标 | [history-record-display](../tests/history-record-display.test.mjs)、[history-filter](../tests/history-filter.test.mjs)、[calendar-paging](../tests/calendar-paging.test.mjs) |
| 存储、草稿、备份和同步 | [inspection-storage](../tests/inspection-storage.test.mjs)、[draft-version](../tests/draft-version.test.mjs)、[inspection-backup](../tests/inspection-backup.test.mjs)、[inspection-sync-queue](../tests/inspection-sync-queue.test.mjs)、[inspection-cloud-mapping](../tests/inspection-cloud-mapping.test.mjs) |
| 偏好、头像和离线身份 | [user-preferences](../tests/user-preferences.test.mjs)、[avatar-recovery](../tests/avatar-recovery.test.mjs)、[offline-identity](../tests/offline-identity.test.mjs) |
| 外观与对比度 | [appearance](../tests/appearance.test.mjs)、[颜色解析辅助](../tests/helpers/appearance-palette.mjs) |
| 导航行为 | [segmented-navigation](../tests/segmented-navigation.test.mjs)、[受控 DOM 与时钟](../tests/helpers/segmented-navigation-fixture.mjs) |
| 历史菜单变形 | [history-menu-paths](../tests/history-menu-paths.test.mjs)：上下线镜像、所有形态交接的端点方向与线段长度；实际淡入淡出与打断仍按浏览器回归验收 |
| 公共 UI、详情操作和离线资源 | [shared-ui](../tests/shared-ui.test.mjs)、[detail-record-actions](../tests/detail-record-actions.test.mjs)、[service-worker](../tests/service-worker.test.mjs) |

外观测试先排除 CSS 注释，再合并浅色基础、深色与高对比度覆盖并解析变量引用。解析器支持当前受测令牌的十六进制色值和完整 `var(--token)` 引用；缺失、循环或不支持的表达式明确失败，新增表达式应同步扩展解析及回归。

导航行为测试直接运行公共控制器，以受控指针事件、布局和动画时钟验证预览/提交、快速反向、松手选择、取消、键盘、减少动态效果和清理。模拟 DOM 不负责浏览器原生捕获、真实布局、React 页面接线或移动端手感，相关情况继续按下表验收。

### 浏览器与真机回归

按修改领域选择检查；表中内容是验收要求，不表示已经全部执行。

| 改动领域 | 必查回归 |
| --- | --- |
| 填写与保存 | 重复泵号交换、局部清空/撤销、全表缺项校验、仍然保存、刷新恢复与新建空白草稿 |
| 历史与确认 | 列表/日历进入详情的返回方向；批量改选使确认失效；取消、打断、重复提交、删除及撤销 |
| 公共切页执行 | 完整应用中详情、日历、备份的双向切换；新页即时挂载、交接无全空正文帧，操作栏与正文入场同步，退场页 inert / aria-hidden；检查网格重叠期间与结束后的自然高度、短长页面及滚动位置；检查原生 transform/opacity 动画及逐帧样式写入，正常速度与压力测试分别记录；快速反向、一级导航离开重入、减少动态效果与不支持 WAAPI 的回退；区分 rAF 调度间隔和实际屏幕呈现，Safari 真机仍需独立验收 |
| 历史屏幕外渲染 | 少量/大量记录的重复进出详情与限速性能对比；快速深滚后无空白卡片、列表高度和入口位置稳定；窄屏、文字放大、旧格式时间换行、批量选择、键盘聚焦与不支持时的普通布局；Safari 真机验收不能由 Chromium 限速数据替代 |
| 两层导航 | 点击、快速反向、按下即动画追踪与甩动、上下偏移和轨道外松手、轨道内竖向手势保持拖动及导航外正常滚动；键盘、吸顶、窄屏、排序与减少动态效果；滑块预览不提前提交业务选择；快速左右甩动仍选择松手最近项，未过中线不额外跳项 |
| 日历分页 | Chromium 与 WebKit 双向连续十二页、第三页前停顿、约 90% 到位时接管、反向、快滑后点击、键盘、滚轮、竖向滚动、边界/跨年和尺寸变化；停稳后标题、日期页、父月份一致，最多七页，不自行翻月 |
| 历史菜单生命周期 | 展开、日历/备份箭头、批量管理勾状态下离开并立即切回，恢复列表与收起汉堡；逐帧检查汉堡/叉号上下线镜像、端点不反向交换，箭头/勾的连续变形；检查形态与按钮组同步启动、普通收起 DOM 保留且 inert / aria-hidden、淡入进度、中线隐去与收起 120ms 后图标组完全透明；功能按钮组原生 transform/opacity 动画、快速反向和不支持 WAAPI 的回退；检查出现/消失与形态变换各自时间线、退场 inert、控制台错误及重复 key 警告 |
| 外观 | 默认跟随系统、手动覆盖、刷新首绘、非法/不可用存储、跨标签页更新；浅色/深色 × 普通/高对比度，减少透明/动态效果；巡检、历史/日历/详情/备份、登录/错误、账号改密/气泡/分裂确认和 Toast；文字放大、窄屏与横屏；双向逐帧与快速反向，输入聚焦、确认展开和分裂中途切换，检查同帧换色、文字对比度及过渡保护自动解除 |
| 公共 UI | 所有调用方、实际字号/尺寸、焦点与 Esc、退出禁用、减少动态效果；细节按 [组件文档](./ui-components.md) |
| 同步 | 离线操作后刷新、联网按序补交、并发追加项保留、旧结果拒绝、墓碑不复活、覆盖/恢复撤销 |
| 草稿 | 多设备新旧版本、同毫秒递增、无版本读取、RPC 拒绝、空白草稿同步 |
| 账号 | 导航与头像跨字段并发、头像 URL 失效重试、改密保留当前会话并撤销其他设备 |
| PWA/发布 | `/xunjian` 路径、manifest 与图标、首次在线后断网重开、新缓存安装失败保留旧缓存 |

浏览器模拟与静态检查不能替代 iPhone / Android 真机、微信工具栏伸缩及双设备联机检查。接手时核对 [已知限制和待复现场景](../PROJECT_HANDOFF.md#接手时注意)，不能把旧审计结论直接当作当前事实。

### 文档校验

纯文档变更检查本地链接和锚点、代码路径、参数、职责归属及差异范围。按当前实现修正文档，历史测试和部署记录留在 Git / Actions，不写成本轮保证。若同时修改代码或测试，继续执行完整质量门禁。

验证报告区分自动化、浏览器和真机范围，记录未执行或失败的项目；临时浏览器补验不等于 CI 已包含浏览器测试。

## GitHub Pages

### 构建与工作流

[next.config.ts](../next.config.ts) 使用 `output: "export"` 与构建环境的 `PAGES_BASE_PATH`；输出在 `out/`，`npm run start` 不作为该静态站点的预览方式。

- [ci.yml](../.github/workflows/ci.yml)：面向 main 的 PR 或手动触发，执行同一质量门禁。
- [deploy.yml](../.github/workflows/deploy.yml)：main 推送或手动触发，注入 `/xunjian` 基础路径和 Supabase secrets，门禁成功后上传并部署 Pages。

### 上线核对

正式地址：<https://ybxunjian.github.io/xunjian/>。发布结果须对应本次推送的提交 SHA，同时确认 build 与 deploy 成功，并核对该地址及静态资源加载；本项目使用 GitHub Pages，不用 Netlify。浏览器保留旧页面时检查刷新与 Service Worker 更新，不用改用户记录来验证上线。
