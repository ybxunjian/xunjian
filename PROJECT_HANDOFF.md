# 夜班巡检项目交接文档

> 更新日期：2026-10-01
> 用途：让新的 Codex 对话快速接手当前代码，避免重新梳理已确认的纸表规则、回退已撤销的交互，或破坏已有浏览器数据。

## 1. 当前状态（60 秒接手）

- 项目目录：仓库根目录（不同开发环境路径可以不同）
- 本地开发地址：<http://localhost:3000/>（需要时在仓库根目录执行 `npm run dev`）
- GitHub 仓库：<https://github.com/ybxunjian/xunjian>
- GitHub Pages 目标地址：<https://ybxunjian.github.io/xunjian/>；`main` 分支推送会触发 `.github/workflows/deploy.yml` 自动构建与发布。发布完成后，应以 Actions 成功状态和该地址实际页面为准。
- 技术栈：Next.js 16.3.2 App Router、React 19、TypeScript、Tailwind CSS 4、本地 shadcn/ui 风格组件、Framer Motion、Lucide、Sonner、localStorage、Supabase Auth/Postgres、PWA manifest。
- 产品形态：仅手机端的 App 风格夜班巡检工具；支持邮箱自行注册、账号登录、邮箱验证、忘记密码、账号头像、本地优先缓存和跨设备云同步。
- 当前密码安全策略：账号内改密和邮件找回重设密码后保留当前设备登录，撤销其他设备会话；在线设备通过 Realtime 及时退出，离线或后台设备在恢复联网或回到前台时退出。
- 主导航默认顺序：`8#冲渣` → `皮带` → `9#冲渣` → `历史记录`；用户可在账号面板拖动排序，第一项为启动页面并跨设备同步；一级导航和皮带子导航会吸顶。
- 设计规范：`DESIGN.md`；唯一的颜色、圆角、阴影和间距 token 在 `src/app/globals.css`。
- 品牌规范：`design/brand/README.md`；唯一品牌图形母版为 `design/brand/night-inspection-master.svg`。
- 架构规范：`ARCHITECTURE.md`。
- 公共交互规范：`docs/ui-components.md`；历史菜单的触发顺序单独见 `docs/history-menu-animation.md`；本对话修改核对见 `docs/conversation-change-audit.md`。
- 当前界面运行时基线：`370a42b`（可接管的日历分页与触摸处理），GitHub Pages 构建与发布已成功；后续纯文档更新不改变该运行时基线。
- 当前同步功能基线：PR #1 的合并提交 `cbb008c`（`提高离线与多设备同步可靠性`），GitHub Pages 构建与部署均已成功；后续纯文档提交不改变该运行时基线。

当前代码已经完成模块化重构：

```text
src/app/page.tsx                         # App Router 路由入口，保持 Server Component
src/features/inspection/
├─ components/                           # 巡检、泵区、皮带、历史、弹窗视图
├─ hooks/use-inspection-controller.ts    # 草稿、同步与对外状态/操作组合
├─ hooks/use-inspection-history.ts       # 保存、历史选择与删除流程
├─ hooks/use-inspection-backup.ts        # 备份、恢复与撤销流程
├─ hooks/use-calendar-pager.ts           # 日历手势、运动位置、归位与月份提交
├─ model/calendar-paging.ts              # 日历目标与速度限制（纯 TypeScript）
├─ model/                                # 类型、配置、字段规则、保存校验和草稿仲裁（纯 TypeScript）
├─ storage/inspection-storage.ts         # 唯一的 localStorage 访问层
└─ sync/
   ├─ inspection-cloud-sync.ts           # Supabase 读写、草稿仲裁与记录映射
   └─ inspection-sync-queue.ts           # 按账号持久化的历史操作队列
src/features/auth/                       # 登录、注册、邮箱验证、密码恢复与会话状态
src/features/account/                    # 账号面板、私有头像与导航偏好同步
src/assets/                              # 独立品牌导出（当前不由运行时代码加载）
src/lib/supabase/client.ts               # 浏览器 Supabase 客户端
public/icons/                            # PWA 普通与 Maskable 图标
design/brand/                            # 品牌母版、规范和历史设计归档
supabase/migrations/                     # 数据表与 RLS 策略
tests/draft-version.test.mjs             # 草稿版本与跨设备冲突规则测试
tests/inspection-sync-queue.test.mjs     # 队列迁移、确认和并发追加保护测试
```

`src/app/page.tsx` 不再承载巡检业务。新的客户端根组件是 `src/features/inspection/components/night-inspection-app.tsx`。

接手后按顺序阅读：

1. `AGENTS.md`
2. 本文档
3. `ARCHITECTURE.md`
4. `README.md`
5. `DESIGN.md`
6. `design/brand/README.md`
7. `src/app/page.tsx`
8. `src/features/inspection/components/night-inspection-app.tsx`
9. `src/features/inspection/hooks/use-inspection-controller.ts`
10. `src/features/inspection/hooks/use-inspection-history.ts`
11. `src/features/inspection/hooks/use-inspection-backup.ts`
12. `src/features/inspection/model/draft-reconciliation.ts`
13. `src/features/inspection/sync/inspection-sync-queue.ts`
14. `src/features/inspection/sync/inspection-cloud-sync.ts`
15. `supabase/migrations/20260906170915_reliable_inspection_sync.sql`
16. `next.config.ts` 与 `.github/workflows/deploy.yml`
17. `docs/ui-components.md`、`docs/history-menu-animation.md` 与 `docs/conversation-change-audit.md`

修改任何 Next.js 代码前，必须先阅读本机 `node_modules/next/dist/docs/` 下对应的 Next.js 16 文档，并遵循 `AGENTS.md`。

## 2. 产品目标与范围

本项目将夜班纸质巡检表转为便于手机现场填写、保存和查阅汇总的工具；目标不是桌面表格或云端管理系统。

四个板块：

1. 8#冲渣区域
2. 皮带区域：SZ101、SZ201、SZ201-N
3. 9#冲渣区域
4. 历史记录：查看汇总、管理、多选删除和详情删除

保存时自动生成填写日期和时间；纸表底部的日期、班次、巡检人、巡检时间不做输入项。

以下内容明确不做，不能因旧纸表或旧截图恢复：

- 8#、9#冲渣液压站油位
- 冲渣料斗下料口
- SZ201、SZ201-N 皮带头轮下料口
- 泵房四段管沟排水、炉地下管廊排水、冲渣沟/阀门漏水检查
- 集水坑、消防水池、车库卫生等其他事项
- 皮带情况、高低速联轴器、头轮气管、尾轮下料口等已删除的独立勾选卡片

## 3. 核心业务规则

### 3.1 通用填写规则

- 黑色实心点代表没有对应点位，不代表异常。
- 正常状态是勾，点击可以切换为叉。
- 数值不显示单位；手机输入使用数字键盘，最多两位。
- 未填写保持为空，不自动写入 `0` 或 `1`。
- 新建会清空填写内容并将皮带子板块重置为 `SZ101`，同时保存一个带新版本时间的空白草稿，以便把清空状态同步到其他设备。

### 3.2 冲渣泵

| 区域 | 设备组 | 可选泵号 |
|---|---|---|
| 8#冲渣 | 冲渣泵 | 101、102、103 |
| 8#冲渣 | 上塔泵 | 501、502、503 |
| 9#冲渣 | 冲渣泵 | 201、202、203 |
| 9#冲渣 | 上塔泵 | 1#、2#、3# |

每组为三台泵、两用一备，只填写两台运行设备。每台填写：南、北、前轴、机身。

同组两张运行泵卡片不能最终保持相同泵号。重复选择时必须交换泵号，而不是禁用选项：

- 当前卡片为空，选择另一张卡片已选泵号：当前取得该泵号，另一张清空。
- 当前已有泵号，再选择另一张的泵号：两张泵号互换。

实现位置：`src/features/inspection/model/field-rules.ts` 的 `selectPump`。不要改回“重复编号不可选”。

每张泵卡片源码中仍保留“盘根引水槽”状态及数据；当前通过 `.pump-status-row` 隐藏。若要删掉而非隐藏，先明确数据兼容范围。

### 3.3 皮带区域

| 皮带 | 当前项目与特殊规则 |
|---|---|
| SZ101 | 电机（单输入）、头轮、头增面轮、尾轮；无液力耦合器、配重类、中间滚筒 |
| SZ201 | 电机/减速机、头轮、配重东/南、配重西/北、配重、中间滚筒、尾轮；无液力耦合器、头增面轮 |
| SZ201-N | 电机/减速机、液力耦合器（单输入，标签“液耦”）、头轮、头增面轮、配重东/南、配重西/北、配重、尾轮；无中间滚筒 |

方向规则：

- SZ101 默认东、西；SZ201 与 SZ201-N 默认南、北。
- 电机/减速机：标签为“电机”“减速机”。
- 配重东/南：标签为“东”“南”；配重西/北：标签为“西”“北”。
- 配重东/南、配重西/北标题前有实心点，“配重”没有。
- 每张皮带项目卡右上角“清空”只能清空当前项目。

设备清单和显示规则的唯一来源是：

- `src/features/inspection/model/config.ts`
- `src/features/inspection/model/field-rules.ts`

## 4. 已完成功能与当前 UI 行为

- 四个一级板块、三个皮带子板块。
- 泵号选择与重复泵号交换。
- 数值输入、局部清空、正常/异常状态切换。
- 保存前完整性检查：分别列出未选择泵号和空白数值；可返回补充或仍然保存。
- localStorage 历史记录、自动日期时间、版本化草稿自动保存与跨设备清空同步。
- Sonner 顶部成功提示；提示文本包含被清空的区域或皮带编号。
- 历史列表、详情汇总、批量管理、二次确认、详情删除。
- 汇总顺序：皮带区域 → 8#冲渣 → 9#冲渣。
- PWA manifest、iPhone Safe Area、GitHub Pages 静态导出。
- 品牌图标已统一为新矢量图形：登录页使用组件内嵌透明 SVG，浏览器和 Apple 图标使用白底版本；PWA 普通图标与 Maskable 图标分离，旧黑底眼形图标已从当前工作区删除。
- 登录与注册共用同一套移动端表单布局；密码输入支持显隐，注册和重置密码均要求二次确认。
- 注册后提供邮箱验证状态与 60 秒重发冷却；已注册账号会在邮箱输入框抖动后显示行内提示和忘记密码入口，不使用易被误解为注册成功的完成页。
- 登录未验证邮箱时可直接重发验证邮件；认证错误优先按 Supabase `error.code` 映射，不依赖英文错误文案。
- 登录页忘记密码流程：发送 Supabase 重置邮件，邮件链接返回当前应用，收到 `PASSWORD_RECOVERY` 后设置并确认新密码。
- 修改密码成功后调用 Supabase Auth 的 `signOut({ scope: "others" })` 撤销其他刷新会话，并写入 Realtime 撤销标记；当前设备保持登录，其他设备执行本地登出。
- 首页右上角为用户头像唯一入口；邮箱、修改密码和退出登录只放在账号面板，不在首页重复展示。账号内修改密码必须填写当前密码验证，邮件找回密码流程不受此限制。退出登录在原按钮位置分列为“取消”和“确认退出”，不再打开确认 Sheet；第一次点击只展开，第二次明确确认才提交，具体动画与交互规则见 `docs/ui-components.md`。
- 云同步状态仍只放首页顶部，备份恢复仍只放历史记录；不要在账号面板增加重复入口。状态区分同步中、离线待同步数量、失败待同步数量和最近同步时间。
- 历史记录保存、删除、合并导入和覆盖恢复先进入按账号隔离的持久化队列；网络失败、刷新页面或同步期间追加操作都不能丢失待提交项。
- 合并导入只新增 UUID 不存在的记录；覆盖恢复通过事务 RPC 恢复目标集合并软删除其余活动记录。普通保存和合并不得复活墓碑。
- `inspection_records` 与 `inspection_drafts` 使用 Realtime 触发跨设备重新拉取；恢复联网和页面回到前台仍必须完整补查。
- 导航排序由 `features/account` 管理并同步到 `user_preferences`；必须校验四个 tab 各出现一次，第一项作为启动页面。导航顺序与头像路径按字段分别更新，旧请求不得覆盖另一设备或后续操作的新值。
- 头像存放于私有 `avatars` bucket 的当前用户目录，使用短期签名 URL；不要改成公开 bucket。只有图片预加载成功后才切换显示，无效缓存需清除并在启动、恢复联网或回到前台时重试。

### 历史记录管理区

- 历史标题右侧是向左展开的圆形图标菜单，依次提供巡检日历、备份与恢复、批量删除；点击外部或按 `Esc` 可收起。菜单按钮位于吸顶导航下方的图层，滚动重叠时由导航遮盖；不显示悬停说明文字，按钮保留无障碍名称，标题行本身不承担层级调整。
- 菜单切换图标以同一组 SVG 线条在三横线、叉、勾和左箭头之间变形；进入批量删除后只保留勾作为完成入口。三个功能按钮保持圆形，使用公共 `Button` 和 Lucide 图标。
- 进入巡检日历时，原菜单按钮在同一位置用同一组线条变成黑色左箭头，替代“返回列表”文字入口；点击箭头返回后变回三条横线，变形为 300ms 并遵从减少动态效果设置。
- 备份与恢复使用历史记录内的独立页面，不再弹出底部窗口；复用日历的切页和返回箭头变形。导出、文件选择、导入预览、合并恢复、覆盖二次确认及一次撤销仍由原备份流程处理；退出该页面清除导入预览，恢复成功后返回列表。
- 菜单通过 Portal 渲染到一级页面动画容器外的静态位置，不参与页面切换位移或淡入淡出；菜单自身展开和图标变形仍保留动画。
- 从历史列表进入详情或切换到其他一级导航时，菜单当前线条在原位向图标中心收缩并淡出：收起时三条横线，展开时叉号两条线，不先切回三横线。退出入口通过 `data-history-menu-transition="exit"` 跳过菜单的外部点击收起逻辑，由最终页面状态触发原有退出动画；点击当前导航项仍按原行为处理。返回列表时统一从中心展开为三条横线并显现。两方向均为 300ms，退场期间菜单不可交互，减少动态效果时立即切换。
- 巡检日历按月展示，周一为首日；有记录的日期使用加粗深色文字，无记录的日期淡化且不可点击，今天使用浅蓝底。点击有记录的日期直接进入当天第一条记录的详情，日历下方不另列记录；同日其他记录可从历史列表进入。翻到最早有记录的月份时隐藏上个月箭头。日期网格使用受控水平分页：拖动直接跟手，松手无过冲归位，新横向手势立即停止旧归位并从当前实际位置接管，不排队或锁定输入；每轮手势最多切一个月，连续手势无需等待。前后各三个月预渲染，以固定月份坐标保持页面位置稳定，避免第三页后重新定位；标题跨过半页同步更新，停稳后向父组件提交月份，旧回调不得覆盖新手势。保留原生竖向滚动、六行固定高度和最早月份限制，具体交互见 `docs/ui-components.md`。
- 批量删除时逐条点选历史卡片，底部操作区显示已选数量和删除按钮；不显示“全选结果”入口。点击勾退出选择模式。
- 普通历史列表仅右侧箭头按钮进入详情，日期文字和卡片背景不触发跳转；只有批量删除模式下整张卡片可点击选择。
- 历史详情底部“返回 / 删除”操作栏是 `fixed`，相对视口和 Safe Area 定位；从日历打开时返回巡检日历，从列表打开时返回历史记录。
- 历史列表的批量删除区不是 `fixed`，而是列表内的 `sticky` 操作区。
- 管理模式下，删除区与末张卡片保持约 8px 间距。`.history-selection-actions` 仅在 `sticky` 实际吸到视口底部时显示顶部 32px 的滚动边缘渐隐；短列表中删除区正常排在最后一张卡片之后，不使末张卡片渐隐。
- 当前渐隐为约 32px 的纯透明度过渡，不使用整片背景模糊；操作区背景不拦截卡片选择点击，按钮自身正常可点。
- 系统启用“减少透明效果”时，该操作区回退为实色背景。
- 不要恢复左滑删除，除非用户明确提出。

### 视觉与触控约束

- 品牌图形只修改 `design/brand/night-inspection-master.svg`，并按 `design/brand/README.md` 同步导出生产资源。不要把 `design/brand/archive/` 中的历史版本接入页面或 manifest。
- 登录页内嵌品牌图形属于装饰内容，紧邻文字标题时使用 `aria-hidden`；功能图标继续使用 Lucide 并提供对应语义。历史菜单切换按钮为满足三横线、叉、勾和左箭头连续变形的单一特例，使用自绘 SVG，按钮通过 `aria-label` 提供无障碍名称，SVG 使用 `aria-hidden`。
- 历史菜单的 `AnimatePresence` 仅在未选中详情记录时开启 `propagate`。详情页菜单为空时，不参与一级导航的退场等待，避免切换导航后内容区停留在空白状态。

- 只做手机端：浅灰页面、白色圆角卡片、蓝色主要操作、适度阴影。
- 首页头部保持深色渐变：`from-slate-950 via-slate-900 to-blue-950`。
- 一级导航：44px 白色圆角轨道、蓝色实心选中态、白字；皮带子导航：42px 浅灰轨道、白底蓝字。
- 导航外层圆角 22px、内边距 4px、选中项圆角 18px；三者必须同步保持同心关系。
- 原生 `<select>` 必须保留，宽 108px、高 44px，焦点过渡 `.18s`。
- “清空”文字维持小号常规字重，触控区域至少 44px；两者不要绑定为同一视觉尺寸。
- 用户若要求只修改框选区域，不得顺手调整周边字号、间距、色彩或历史汇总排版。

### 动画与无障碍

动画应短、自然、克制：

| 位置 | 当前参数 |
|---|---|
| 一级板块内容切换 | Framer Motion `mode="wait"`；退出上移 6px / 180ms，进入从下方 8px / 180ms |
| 历史列表/详情切换 | 单段 180ms，轻量水平推进 |
| 历史详情底部操作栏 | 180ms；进入延迟一个详情进入时长 |
| 一级与皮带导航选中态 | CSS 200ms |
| Button 按压 | CSS 200ms，默认缩放至 0.97；退出登录控件局部为 0.99 |
| 历史菜单功能按钮组 | 240ms；退出淡出、右移 24px、缩放至 0.86，保留原定义 |
| 历史菜单线条 | 300ms；中线 pathLength / 透明度 200ms，返回箭头时延迟 80ms |
| 移除头像确认气泡 | 原生 WAAPI；打开 390ms、收回 210ms，原点 `50% -8.5px`；完整关键帧见公共交互规范 |
| 退出登录分列 | Framer Motion；展开 280ms、合回 220ms，无回弹，阴影和文字同步过渡；动画期间可交互 |
| 巡检日历归位 | 可随时接管；刚度 420、阻尼 `2 * sqrt(420)`，限制初速度防过冲，时长随剩余距离和速度变化 |
| 原生 Select 焦点 | 180ms |
| 公共 Sheet 遮罩 | Framer Motion 默认 tween；减少动态效果时 0ms |
| 公共 Sheet 面板 | 外层刚度 420、嵌套层 460，阻尼 34；减少动态效果时 0ms |

`prefers-reduced-motion` 已压缩 CSS 动画；公共 Sheet、历史菜单、历史详情切换与底部操作栏、头像气泡、退出登录分列及日历归位均已处理减少动态效果。一级板块内容切换仍为固定 180ms，尚未完整接入；后续修改须单独验证，不能因修复菜单触发顺序而改变其他动画。

## 5. 数据、存储与兼容性

类型定义：`src/features/inspection/model/types.ts`

```ts
type InspectionRecord = {
  id: string;
  date: string;
  time: string;
  values: Record<string, string>;
};
```

- 历史记录键：`night-inspection`，存储 `InspectionRecord[]`。
- 草稿键：`night-inspection-draft`，当前格式为 `{ values, beltTab, updatedAt? }`。
- 离线账号标识键：`night-inspection-offline-identity`，仅保存上次已验证账号的 ID、邮箱和邮箱验证时间；由 `src/features/auth/storage/offline-identity.ts` 管理，显式退出时清除。
- 草稿读取必须兼容旧版只保存 `values` 对象的格式。
- `StoredInspectionState.hasDraft` 必须保留：它用于区分“存在一个内容为空的草稿”和“根本没有草稿”，不能再用 `Object.keys(values).length` 推断。
- 巡检数据的 localStorage 访问只能放在 `src/features/inspection/storage/inspection-storage.ts`；账号偏好缓存只能放在 `src/features/account/storage/`，组件和领域模型不得直接访问 `localStorage`。
- 修改字段 key、记录结构或存储键之前，必须先设计归一化/迁移并验证旧浏览器数据。
- 未配置 Supabase 时，清理浏览器站点数据、换浏览器或换手机会丢失记录；配置并登录后可从云端恢复。
- 第一个登录账号接管未归属账号的旧数据；同一浏览器中的不同账号使用隔离缓存。
- 云端表使用 RLS 按 `auth.uid() = user_id` 隔离；记录采用软删除，草稿按更新时间解决冲突。
- 草稿规则位于 `model/draft-reconciliation.ts`：较新版本胜出、相同版本采用云端副本、无版本旧草稿不能覆盖已有云端草稿。编辑时间戳必须严格递增；RPC `upsert_inspection_draft_if_newer` 是服务端的最终并发保护，返回 `false` 后客户端必须重新获取云端版本。
- 历史操作队列键为 `night-inspection-sync-queue:{user_id}`，由 `sync/inspection-sync-queue.ts` 独占管理。每项操作有稳定 `operationId`，成功后只能移除当前完成项；执行期间加入的新操作必须保留。旧版无 ID 队列在读取时自动补齐 ID。
- 普通记录写入和合并导入使用 insert-only 语义；`deleted_at` 墓碑优先，不能被普通同步复活。覆盖恢复是唯一允许恢复墓碑的入口，并优先调用 `replace_inspection_records` 事务 RPC。
- 历史同步失败按 1、3、10、30 秒退避重试；在线恢复、页面回到前台和 Realtime 变更都会触发补查。同步请求期间若本地记录修订号改变，必须丢弃返回的旧列表并再次同步。
- 跨设备会话撤销复用 `user_preferences`：`sessions_revoked_at` 记录撤销时间，`sessions_revoked_by` 记录发起会话 ID；当前会话据此保持登录，其他会话退出。
- 仓库迁移文件为 `supabase/migrations/20260830040000_session_revocation_realtime.sql`；生产 Supabase 已执行并登记为 `20260830110531_session_revocation_realtime`。该迁移只新增两个可空字段并把 `user_preferences` 加入 `supabase_realtime` publication，不改动现有用户、巡检、头像或导航数据。
- `supabase/migrations/20260831101013_protect_drafts_and_add_recorded_at.sql` 为历史记录增加 `recorded_at`，并提供受 Auth 与参数校验保护的草稿条件写入 RPC。新环境必须按文件名顺序执行到该迁移。
- `supabase/migrations/20260901043209_revoke_rls_auto_enable_api_execution.sql` 撤销 `PUBLIC`、`anon`、`authenticated`、`service_role` 对 `public.rls_auto_enable()` 的直接执行权。`ensure_rls` 事件触发器继续由 `postgres` 自动执行；不要为消除告警而删除该触发器或改成 `SECURITY INVOKER`。
- `supabase/migrations/20260906170915_reliable_inspection_sync.sql` 创建 `replace_inspection_records(uuid, jsonb)` 事务 RPC，对载荷和重复 ID 做校验，并把 `inspection_records`、`inspection_drafts` 加入 `supabase_realtime` publication。生产 Supabase 已执行并登记为 `20260906172820_reliable_inspection_sync`；新环境必须执行仓库中的迁移文件，不能依赖客户端滚动发布回退。
- PWA manifest 配合构建生成的 Service Worker 缓存首页和静态资源；首次在线访问后可断网重开。Supabase 请求不缓存，浏览器清理站点数据后仍需重新在线访问。

## 6. 架构与部署约束

依赖方向：

```text
app → features/inspection → components/ui
                          → lib

components → hooks → model
                   → storage → model
```

- `src/app` 只放路由、布局和全局样式。
- `src/app/icon.svg`、`src/app/apple-icon.png` 和 `src/app/favicon.ico` 是 Next.js 元数据资源；登录页品牌图形以内嵌 `AuthLogo` 组件呈现，`src/assets/night-inspection-logo.svg` 仅作为独立透明导出保留，不参与运行时加载。
- manifest 只引用 `public/icons/night-inspection-192-v2.png`、`night-inspection-512-v2.png` 和独立的 `night-inspection-maskable-512-v2.png`。Maskable 图标的重要内容必须处于中央 40% 半径安全圆内。
- `model` 保持纯 TypeScript，不依赖 React、DOM、Framer Motion 或浏览器 API。
- `components/ui` 不能依赖业务模块。
- 巡检专属组件留在 `src/features/inspection/components`，通用控件才可进入 `src/components/ui`。
- 不新增第二套 UI 系统、状态库或完整 UI 库；现有 React state、Hook、Tailwind、Framer Motion 足够。
- `next.config.ts` 使用静态导出：

```ts
output: "export"
basePath: process.env.PAGES_BASE_PATH
allowedDevOrigins: ["127.0.0.1", "localhost"]
```

- GitHub Pages 构建需保持 `PAGES_BASE_PATH='/xunjian'`。
- 对 Git/部署做出操作前，先只读检查 `git status` 与 `git remote -v`；不要假设本机有可用推送链路或 GitHub CLI 登录。

## 7. 当前已知问题与候选工作

### 已知问题

1. 快速连续点击一级导航时，选中标签和内容偶尔错位。根因与带退出等待的 `AnimatePresence mode="wait"` 有关；不能简单删除动画，必须同时保留细腻切换体验。
2. 一级板块内容切换尚未完整遵从“减少动态效果”；保存/删除弹层已通过公共 `Sheet` 接入，不能再按旧 Dialog 状态判断。
3. 生产 Supabase 已完成包括 `20260906170915_reliable_inspection_sync.sql` 在内的全部迁移；新建或更换 Supabase 项目时仍需按文件名顺序执行 `supabase/migrations/`，并配置环境变量和 Authentication URL。仓库本身不包含凭据。
4. 离线资源依赖浏览器保留站点缓存；首次访问、账号首次登录和浏览器清理站点数据后仍需要网络。

### 尚未实现

- APK：可用 Capacitor 包装当前静态导出，无需引入 Ionic UI；当前未安装或配置。

## 8. 开发与验证

启动：

```powershell
npm run dev
```

质量门禁（每次代码改动后都执行）：

```powershell
npm run lint
npx tsc --noEmit
npm test
$env:PAGES_BASE_PATH='/xunjian'
npm run build
```

截至 2026-10-01，界面基线 `370a42b` 已通过 GitHub Pages 的质量门禁与部署；当前测试集 61 项全部通过，包含头像恢复、草稿版本、字段规则、保存校验、备份兼容、存储兼容、历史同步队列、云映射、导航偏好、离线身份、Service Worker、公共 UI 和日历分页规则。日历的 Chromium / WebKit 连续翻页、归位接管、反向、日期点击、边界、键盘、竖向滚动及减少动态效果检查已通过；浏览器自动化不替代 iPhone / Android 真机手感验收。

涉及交互时至少手工检查：

- 四个一级板块与三个皮带子板块能正常切换；快速切换不出现错位。
- 重复泵号按交换规则处理。
- 数值输入最多两位；卡片清空仅影响当前卡片；顶部提示文案正确。
- 刷新后草稿、泵号、状态和当前皮带子板块能恢复；新建后内容为空且回到 `SZ101`，另一设备同步后也应得到空白草稿。
- 两台设备同时修改草稿时较新版本胜出；旧版无时间戳缓存、较旧 RPC 写入和相同时间版本都不能覆盖已确认的云端新版本。
- 断网保存、删除或导入后，首页显示正确的待同步数量；刷新页面后队列仍在，恢复联网后按顺序提交并归零。
- 同步进行期间继续保存或删除时，新操作不能被前一个请求的完成确认清除，旧同步结果也不能覆盖最新本地列表。
- 合并导入不删除云端其他设备记录且不复活墓碑；覆盖恢复通过事务得到与备份一致的活动记录集合。
- 两台设备新增、删除记录或修改草稿时，另一台由 Realtime 触发重新拉取；断线重连和回到前台后也能补齐变化。
- 保存校验能区分未选泵号与空数值；保存后汇总顺序、日期时间与历史持久化正确。
- 历史列表到详情及返回方向正确；详情底部操作栏始终相对视口稳定。
- 历史菜单可向左展开并收起，图标在三横线、叉、勾和左箭头之间连续变形；滚动重叠时位于吸顶导航下方。巡检日历只显示月份网格，有记录日期可打开详情，无记录日期不可点击，最早记录月份不显示上个月箭头。
- 历史菜单展开后切换导航或进入详情，叉号直接按原路径退出，不能先变三横线；详情为空菜单不得阻塞一级导航退场等待。
- 头像气泡按指定 390ms / 210ms WAAPI 时间线打开与收回；父面板重渲染或其他弹层变化不得重启动画。
- 退出登录从中心分列为两个胶囊，阴影连续过渡；动画中途可操作，展开后滑动页面不收回，仅请求期间禁止重复确认。
- 日历检查双向连续十二页、第三页前停顿、约 90% 归位时接管、反向和快滑后立即点日期；标题、网格和停稳后的父组件月份一致，页面最多七个。
- 历史管理模式下，删除区为列表内吸底；末张卡片只在靠近删除区时轻微渐隐，删除按钮不遮挡或抢占卡片点击。
- GitHub Pages 构建时 `/xunjian` 子路径资源正确。
- 两台设备登录同一账号，在其中一台修改密码后，当前设备保持登录；另一台在线时及时退出，离线或后台时在恢复联网/回到前台后退出。
- 一台设备修改导航、另一台更新头像时，两项设置都能保留；旧异步响应不能把较新的头像路径或导航顺序覆盖回去。
- 头像签名 URL 失效或首次加载失败时继续显示当前可用头像，并在启动、恢复联网或回到前台时重试。

## 9. 新对话直接粘贴

```text
继续开发夜班巡检仓库 `https://github.com/ybxunjian/xunjian`。

先完整阅读：
1. AGENTS.md
2. PROJECT_HANDOFF.md
3. ARCHITECTURE.md
4. README.md
5. DESIGN.md
6. design/brand/README.md
7. src/app/page.tsx
8. src/features/inspection/components/night-inspection-app.tsx
9. src/features/inspection/hooks/use-inspection-controller.ts
10. src/features/inspection/sync/inspection-sync-queue.ts
11. src/features/inspection/sync/inspection-cloud-sync.ts
12. supabase/migrations/20260906170915_reliable_inspection_sync.sql

不要重新设计、不要回退已完成内容。业务规则、样式和数据兼容以当前源码为最终依据；先说明当前状态，再执行我的新需求。
```
