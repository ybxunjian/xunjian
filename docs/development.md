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

TypeScript 启用 `noUnusedLocals` 和 `noUnusedParameters`，在类型检查阶段阻止遗留未使用的局部变量、导入和参数；导出项、动态引用、样式与兼容逻辑仍须按治理约定核对消费者后再清理。

### 自动化测试

测试数量以当次完整运行输出为准，不沿用旧发布数字。`npm test` 自动发现 `tests/*.test.mjs`；`tests/helpers/` 提供测试辅助代码，不进入运行时。当前入口如下：

| 领域 | 测试入口 |
| --- | --- |
| 设备、字段和保存校验 | [field-rules](../tests/field-rules.test.mjs)、[inspection-draft-actions](../tests/inspection-draft-actions.test.mjs)、[inspection-validation](../tests/inspection-validation.test.mjs) |
| 历史时间、筛选和日历目标 | [history-record-display](../tests/history-record-display.test.mjs)、[history-filter](../tests/history-filter.test.mjs)、[calendar-paging](../tests/calendar-paging.test.mjs) |
| 存储、草稿、备份和同步 | [inspection-storage](../tests/inspection-storage.test.mjs)、[draft-version](../tests/draft-version.test.mjs)、[inspection-backup](../tests/inspection-backup.test.mjs)、[inspection-sync-queue](../tests/inspection-sync-queue.test.mjs)、[inspection-cloud-mapping](../tests/inspection-cloud-mapping.test.mjs) |
| 偏好、头像和离线身份 | [user-preferences](../tests/user-preferences.test.mjs)、[avatar-recovery](../tests/avatar-recovery.test.mjs)、[offline-identity](../tests/offline-identity.test.mjs) |
| 外观与对比度 | [appearance](../tests/appearance.test.mjs)、[颜色解析辅助](../tests/helpers/appearance-palette.mjs) |
| 导航行为 | [segmented-navigation](../tests/segmented-navigation.test.mjs)、[受控 DOM 与时钟](../tests/helpers/segmented-navigation-fixture.mjs) |
| 公共 UI、详情操作和离线资源 | [shared-ui](../tests/shared-ui.test.mjs)、[detail-record-actions](../tests/detail-record-actions.test.mjs)、[service-worker](../tests/service-worker.test.mjs) |

外观测试先排除 CSS 注释，再合并浅色基础、深色与高对比度覆盖并解析变量引用。解析器支持当前受测令牌的十六进制色值和完整 `var(--token)` 引用；缺失、循环或不支持的表达式明确失败，新增表达式应同步扩展解析及回归。

导航行为测试直接运行公共控制器，以受控指针事件、布局和动画时钟验证预览/提交、快速反向、松手选择、取消、键盘、减少动态效果和清理。模拟 DOM 不负责浏览器原生捕获、真实布局、React 页面接线或移动端手感，相关情况继续按下表验收。

### 动画执行路径的等效性与开销

保持视觉参数的优化仍需验证运动过程。两层导航在相同坐标、事件序列和时间步长下，逐事件/帧比较 transform、按压透明度、高亮、选择回调和待执行帧；覆盖三项/四项布局、90ms 采样边界、重复移动、快速反向及减少动态效果。浏览器另查实际组件接线、指针捕获、键盘、宽度变化，以及浅深色停稳和按住状态；停稳截图一致不等于所有中间帧或真机手感已验证。

详情与批量分裂及改密展开，核对原生动画的属性、时长、曲线、延迟、打断接续和卸载清理；保留对应业务的焦点、禁用和改选重置检查。详情宽度需同时核对 JS 混色时间线、响应式 calc 和全程间距；改密需核对内容尺寸变化、滚动定位、下方偏好区持续可见并自然位移，以及收起完成回调。分别在顶部、中段和滚动到底收回，检查下方内容无反复小幅位移，并覆盖不同面板尺寸、文字放大与像素密度。无 WAAPI、不支持注册属性与减少动态效果分别验收，不能只测试正常播放到终点。

记录环境、场景和采样范围，分开报告 JS 样式写入、脚本耗时、样式计算、布局与实际帧表现。少写属性不代表等比例提速，WAAPI 的宽度、高度及位置动画仍可能需要布局。临时对比脚本和截图放在项目外，验证结果随本轮交付或 CI 记录提供，不将一次测量固化为通用性能保证。

历史菜单另查三个功能图标的原生 transform，以及 SVG 路径、各线透明度和中线绘制长度的中间帧等效性；覆盖快速反向、箭头/勾状态、退场重入、Escape 焦点、外部点击、减少动态效果与无 WAAPI 回退。分别统计按钮组样式与 SVG 属性写入；桌面浏览器结果不能代替 iPhone Safari 真机帧率验收。

菜单点击回归需记录 pointerdown / pointerup / click 目标及 aria-expanded 变化，覆盖按下命中外部但 click 命中按钮的事件序列、四边四角、轻微滑动与取消、快速连点，以及页面放大后的命中。核对按压时按钮仍为 44×44px、仅内部图标缩小；真实 Portal 中主导航/详情退出标记、日历/备份/批量管理、返回/完成、Escape 与焦点恢复均须保留。隔离浏览器的事件序列模拟不能代替微信真机复核。

### 浏览器与真机回归

按修改领域选择检查；表中内容是验收要求，不表示已经全部执行。

| 改动领域 | 必查回归 |
| --- | --- |
| 填写与保存 | 重复泵号交换、局部清空/撤销、全表缺项校验、仍然保存、刷新恢复与新建空白草稿 |
| 历史与确认 | 列表/日历进入详情的返回方向；批量改选使确认失效；取消、打断、重复提交、删除及撤销；批量栏吸底时渐进模糊、短列表自然排布、浅深色、滚动与尺寸变化、减少透明效果及不支持滤镜/遮罩的回退；底部模糊延伸不增加滚动高度，微信底栏连续伸缩时检查露底、清晰条带和实色接缝；按钮和数量保持清晰，装饰层不拦截选择与确认 |
| 公共切页执行 | 完整应用中详情、日历、备份的双向切换；新页即时挂载、交接无全空正文帧，操作栏与正文入场同步，退场页 inert / aria-hidden；检查网格重叠期间与结束后的自然高度、短长页面及滚动位置；检查原生 transform/opacity 动画及逐帧样式写入，正常速度与压力测试分别记录；快速反向、一级导航离开重入、减少动态效果与不支持 WAAPI 的回退；区分 rAF 调度间隔和实际屏幕呈现，Safari 真机仍需独立验收 |
| 历史屏幕外渲染 | 少量/大量记录的重复进出详情与限速性能对比；快速深滚后无空白卡片、列表高度和入口位置稳定；窄屏、文字放大、旧格式时间换行、批量选择、键盘聚焦与不支持时的普通布局；Safari 真机验收不能由 Chromium 限速数据替代 |
| 两层导航 | 点击、快速反向、按下即动画追踪与甩动、上下偏移和轨道外松手、轨道内竖向手势保持拖动及导航外正常滚动；键盘、吸顶、窄屏、排序与减少动态效果；滑块预览不提前提交业务选择；快速左右甩动仍选择松手最近项，未过中线不额外跳项 |
| 日历分页 | Chromium 与 WebKit 双向连续十二页、第三页前停顿、约 90% 到位时接管、反向、快滑后点击、键盘、滚轮、竖向滚动、边界/跨年和尺寸变化；停稳后标题、日期页、父月份一致，最多七页，不自行翻月 |
| 历史菜单生命周期 | 展开、日历/备份箭头、批量管理勾状态下离开并立即切回，恢复列表与收起汉堡；检查出现/消失与形态变换各自时间线、退场 inert、控制台错误及重复 key 警告 |
| 外观 | 默认跟随系统、手动覆盖、刷新首绘、非法/不可用存储、跨标签页更新；浅色/深色 × 普通/高对比度，减少透明/动态效果；巡检、历史/日历/详情/备份、登录/错误、账号改密/气泡/分裂确认和 Toast；文字放大、窄屏与横屏；双向逐帧与快速反向，输入聚焦、确认展开和分裂中途切换，检查同帧换色、文字对比度及过渡保护自动解除 |
| 公共 UI | 所有调用方、实际字号/尺寸、焦点与 Esc、退出禁用、减少动态效果；详情与批量分裂确认另查原生动画及样式写入、快速反向、动画中主题/宽度变化、无 WAAPI 回退和卸载清理，详情全程 8px 间距及文字交接、批量入口完整点击区域及同数量改选重置；细节按 [组件文档](./ui-components.md) |
| 同步 | 离线操作后刷新、联网按序补交、并发追加项保留、旧结果拒绝、墓碑不复活、覆盖/恢复撤销 |
| 草稿 | 多设备新旧版本、同毫秒递增、无版本读取、RPC 拒绝、空白草稿同步 |
| 账号 | 导航与头像跨字段并发、头像 URL 失效重试、改密保留当前会话并撤销其他设备；改密展开/收回的浅深色外观、原生高度动画与样式写入、快速反向、内容尺寸变化、滚动定位、Escape/焦点恢复、退出清理、减少动态效果和不支持 WAAPI 的回退 |
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
