# 开发与发布

本文件维护环境、数据库初始化、验证与 GitHub Pages 发布。开发边界见[维护约定](../GOVERNANCE.md)。

## 环境与安装

使用 Node.js 22，执行 npm ci 安装锁定依赖：

```bash
npm ci
npm run dev
```

开发地址为 <http://localhost:3000/>。完整版本以 package.json 和 package-lock.json 为准。静态导出输出至 out，npm run start 不用于该静态站点的生产预览。

## Supabase 初始化

将 [.env.example](../.env.example) 复制为 .env.local，填写：

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

兼容旧 anon key，禁止使用 service_role。两个变量都存在时启用账号模式，否则进入本地模式。公开变量在构建时进入浏览器代码，修改发布配置后需重新构建。

### 数据库迁移

新环境按文件名顺序执行 [supabase/migrations](../supabase/migrations/)：

| 迁移 | 职责 |
| --- | --- |
| 202608280001_create_inspection_sync.sql | 记录、草稿和初始 RLS |
| 20260829150903_user_preferences_and_private_avatars.sql | 账号偏好、私有头像与策略 |
| 20260830040000_session_revocation_realtime.sql | 会话撤销标记、偏好 Realtime |
| 20260831101013_protect_drafts_and_add_recorded_at.sql | 草稿条件写入 RPC、记录时间 |
| 20260901043209_revoke_rls_auto_enable_api_execution.sql | 撤销内部函数的 API 执行权限 |
| 20260906170915_reliable_inspection_sync.sql | 整体替换事务 RPC、巡检 Realtime |

迁移文件存在不代表生产已执行。更换项目需核验迁移、RLS、Storage 和 Realtime；数据契约见[数据与同步](./data-and-sync.md)。

### 邮件与发布变量

生产 Site URL 和允许的 Redirect URL 使用 `https://ybxunjian.github.io/xunjian/`，本地按需加入 `http://localhost:3000/`。注册验证及重置邮件均回到当前应用路径。

GitHub Actions secrets 配置上述两个公开变量；发布工作流在构建时注入。

## 验证

### 完整质量门禁

代码改动执行：

```bash
PAGES_BASE_PATH=/xunjian npm run check
```

PowerShell：

```powershell
$env:PAGES_BASE_PATH='/xunjian'
npm run check
```

顺序为 lint → next typegen 与 tsc --noEmit → tests → production build → Service Worker 生成。任一步失败均不能算通过。单独排查可运行 lint、typecheck、test、build；裸 tsc --noEmit 不能代替路由类型生成。

纯文档变更核对链接、锚点、源码路径与事实，不需要重复执行应用测试。图像变更检查源稿与导出一致、尺寸、引用及生产构建；若同时改动代码，执行完整门禁。

### 自动化范围

npm test 发现 tests/*.test.mjs；tests/helpers 提供受控环境，不进入运行时。

| 范围 | 主要入口 |
| --- | --- |
| 设备和保存 | field-rules、inspection-draft-actions、inspection-validation |
| 时间、历史和日历 | history-record-display、history-filter、calendar-paging |
| 数据与同步 | inspection-storage、draft-version、inspection-backup、inspection-sync-queue、inspection-cloud-mapping |
| 账号与离线身份 | user-preferences、avatar-recovery、offline-identity |
| 外观与 UI | appearance、shared-ui、detail-record-actions |
| 导航和缓存 | segmented-navigation、service-worker |

用例见 [tests](../tests/)。颜色解析测试只支持当前实现使用的表达式，新增表达式要同步扩展解析器。受控 DOM、时钟与纯规则测试不能证明浏览器原生事件、真实布局或真机帧率。

### 浏览器与真机回归

按改动领域选择检查：

| 改动领域 | 核心验收 |
| --- | --- |
| 填写和保存 | 泵号交换、局部清空撤销、全表缺项校验、新建与刷新恢复 |
| 历史和备份 | 列表/日历返回关系、删除撤销、批量改选、合并/覆盖与恢复撤销 |
| 页面和菜单 | 新页及时显示、退场禁用、快速离开重入、菜单形态与焦点、边缘点击 |
| 导航和日历手势 | 拖动、快速反向、取消、滚动边界、键盘、宽度变化和减少动态效果 |
| 账号和主题 | 头像恢复、改密和退出确认、浅深色/高对比度、切换中动画与焦点 |
| 数据同步 | 离线补交、并发追加、旧结果拒绝、墓碑、草稿冲突、账号隔离 |
| PWA和分享 | basePath、静态资源、安装名称、分享图、离线重开和缓存更新 |

动画调整检查运动过程、打断和卸载，不只看终点截图。原生动画核对属性、曲线、延迟和回退；不要把减少脚本写入等同于固定帧率。

手机重点覆盖微信工具栏伸缩、Safe Area、底部操作栏、键盘和滚动；涉及账号同步时用真实双设备验证。报告区分自动化、桌面浏览器和真机范围，不写入长期“全部通过”结论。

## GitHub Pages

### 构建与工作流

[next.config.ts](../next.config.ts) 使用静态导出和构建变量 PAGES_BASE_PATH。

- [ci.yml](../.github/workflows/ci.yml)：main 的 PR 或手动触发，执行完整门禁。
- [deploy.yml](../.github/workflows/deploy.yml)：main 推送或手动触发；通过 configure-pages 取得 basePath，注入公开配置，门禁后上传 out 并部署。

本项目使用 GitHub Pages。其他设备获取改动使用 git pull --ff-only，先保留本机未提交内容。

### 上线核对

1. 确认提交范围、分支和远端，推送明确的发布提交。
2. 确认同一 SHA 对应的 build 与 deploy 均成功。
3. 核对[正式网站](https://ybxunjian.github.io/xunjian/)及静态资源、manifest 和分享图。
4. 旧页面未更新时检查刷新、Service Worker 生命周期和分享平台缓存，不删除用户巡检数据来排查。

离线缓存策略见[数据与同步](./data-and-sync.md#离线资源)，品牌和分享资源维护见[品牌文档](../design/brand/README.md)。
