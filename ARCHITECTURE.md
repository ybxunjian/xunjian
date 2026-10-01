# 项目架构

本项目采用 Next.js App Router 与按业务功能组织的模块化单体结构。目标是在不增加状态库或第二套 UI 系统的前提下，让业务规则、浏览器存储和页面展示可以独立演进。

## 目录职责

```text
src/
├─ app/                         # Next.js 路由、布局和全局设计令牌
├─ assets/                      # 独立品牌导出，运行时不加载
├─ components/ui/               # 可跨业务复用的基础 UI 组件
├─ features/inspection/
│  ├─ components/               # 巡检界面，按泵区、皮带、历史和弹窗拆分
│  ├─ hooks/                    # 草稿同步、历史管理和备份恢复编排
│  ├─ model/                    # 类型、设备配置、字段规则、校验和草稿仲裁
│  ├─ storage/                  # localStorage 兼容层
│  ├─ sync/                     # 云同步、持久化离线操作队列与冲突保护
│  └─ index.ts                  # 模块公开入口
├─ features/account/            # 账号面板、头像、导航偏好及其本地/云端同步
├─ features/auth/               # Supabase 登录、注册、邮箱验证、密码恢复与会话撤销
├─ lib/supabase/                # 浏览器 Supabase 客户端
└─ lib/                         # 与具体业务无关的通用工具
public/icons/                   # manifest 引用的 PWA 普通与 Maskable 图标
design/brand/                   # 品牌母版、导出规范与历史设计归档
```

## 依赖方向

```text
app → features/inspection → components/ui
    → features/account    → lib

components → hooks → model
                   → storage → model
```

- `app` 只负责路由入口，不放巡检业务。
- `model` 是纯 TypeScript，不依赖 React、DOM、动画或 localStorage。
- `storage` 是唯一可以直接访问巡检 localStorage 键的目录。
- `sync` 通过 `storage` 保留本地优先语义，并把账号数据同步到 Supabase。
- `features/account` 独立管理用户偏好缓存、私有头像和账号面板，不把账号设置混入巡检控制器。
- `components/ui` 不得依赖 `features`，避免基础组件与业务反向耦合。
- `features/inspection/index.ts` 是业务模块对外公开入口；模块内部直接引用具体文件。
- 历史记录的日期解析与日历分组放在 `model/history-filter.ts`，巡检日历和管理菜单留在 `features/inspection/components/history/`；菜单复用公共 `Button`，不把业务状态放进基础组件。
- `design/brand/night-inspection-master.svg` 是品牌图形的唯一设计母版；`src/app`、`src/assets` 和 `public/icons` 中的图标均为品牌派生资源；`src/assets` 中的独立透明导出用于品牌核对，不参与页面加载。

## 界面交互职责

- `HistoryCalendar` 负责日历网格、月份标题和日期选择；`hooks/use-calendar-pager.ts` 负责 Pointer Events、横向触摸与滚轮处理、运动位置、可接管归位、外部导航和最终月份提交。目标月份、月差、拖动边界及归位初速度限制留在纯规则 `model/calendar-paging.ts`，不让模型依赖 React、DOM 或 Framer Motion。
- `HistoryQuickMenu` 保留自己的展开和 SVG 线条动画；外部退出入口通过 `data-history-menu-transition="exit"` 由最终页面状态驱动。具体触发约定见 `docs/history-menu-animation.md`。
- 公共 `ConfirmationPopover` 负责锚定气泡结构、焦点、退出卸载和每个实例独立的原生 WAAPI 动画；账号的头像移除请求继续由 `AccountDialog` 处理。WAAPI 是浏览器能力，不引入第二个动画依赖。
- `account/components/account-sign-out-controls.tsx` 负责原位分列、胶囊拼接、阴影、焦点和外部轻点取消；退出请求与防重复提交仍由 `AccountDialog` 处理，不另开退出确认 Sheet。
- 公共 `Sheet` 管理弹层栈、滚动锁定、顶层焦点、`inert` 和减少动态效果。修改密码使用账号内 `AccountPasswordControls` 原位展开与 `AccountPasswordForm`，不再打开嵌套 Sheet；外层 Sheet 可在展开期间锚定原顶部位置。

动画参数和回归要求以 `docs/ui-components.md` 为准；本对话的最终实施范围见 `docs/conversation-change-audit.md`。

## 数据兼容约束

历史记录继续使用 `night-inspection`，草稿继续使用 `night-inspection-draft`。历史记录结构保持为：

```ts
type InspectionRecord = {
  id: string;
  date: string;
  time: string;
  values: Record<string, string>;
};
```

草稿读取必须继续兼容旧版仅保存 `values` 对象的格式。当前格式为 `{ values, beltTab, updatedAt? }`；`hasDraft` 在内存和账号缓存中区分“确实存在空白草稿”与“没有草稿”。未来需要升级数据结构时，应先在 `storage` 中增加读取归一化或迁移逻辑，再修改领域模型，组件不得自行解析旧数据。

配置 Supabase 后，第一个登录账号会接管尚未归属账号的旧本地数据。不同账号在同一浏览器中使用独立缓存；云端记录按 UUID 合并，删除使用 `deleted_at` 墓碑，草稿按 `updated_at` 解决冲突。RLS 必须始终使用 `auth.uid() = user_id` 隔离数据。

用户导航顺序保存在 `user_preferences`，本地缓存键按用户隔离；四个一级导航必须各出现一次，第一项同时是启动页面。头像存放在私有 `avatars` bucket 的 `{user_id}/` 目录，通过短期签名 URL 展示，上传前在浏览器裁切压缩为 256×256 WebP。签名 URL 可按头像路径缓存在浏览器中，但只有在图片预加载成功后才能替换当前显示；无效缓存会被清除，并在启动、恢复联网或回到前台时重试。

## 巡检数据流与草稿仲裁

`use-inspection-controller.ts` 编排页面状态，但不直接实现冲突规则。职责链为：

```text
用户编辑
  → applyDraftChange 生成严格递增的 updatedAt
  → inspection-storage 立即写入本地草稿和账号缓存
  → 800ms 防抖后调用 inspection-cloud-sync
  → Supabase RPC 仅提交不旧于云端的草稿
  → 过期写入重新拉取云端胜出版本
```

纯规则集中在 `model/draft-reconciliation.ts`：

- 没有本地草稿时直接采用云端草稿，云端也为空则保持为空。
- 本地草稿没有合法 `updatedAt` 时视为旧版草稿；已有云端草稿时不能覆盖云端。
- 两端都有版本时，较新的 `updatedAt` 胜出；相同时间采用已确认的云端副本。
- 本地较新时调用 `upsert_inspection_draft_if_newer`；RPC 返回旧版本拒绝后再次拉取云端。
- 每次真实编辑至少比上一版本增加 1ms，避免同一毫秒内连续操作产生相同版本。
- “新建”是一次真实编辑：写入带版本的空白草稿并重置到 `SZ101`，从而把清空状态同步到其他设备。

历史记录与草稿使用不同策略。历史记录的保存、删除、撤销删除、合并导入和整体恢复在发起网络请求前进入按账号隔离的 localStorage 操作队列；每项操作拥有稳定 ID，成功后仅移除对应项，执行期间追加的操作不会被清空。同步开始时先冲刷队列，再分页读取云端记录；普通新增使用 insert-only 语义，不能复活墓碑，只有用户明确选择的覆盖恢复或撤销删除可以恢复已删除记录。删除提示的撤销只合并本次删掉的记录，不覆盖后续新增或其他删除；云端 `restore` 操作按队列顺序在删除后清除这些记录的墓碑，离线时保留待同步操作。当前账号的巡检页面卸载时撤销提示失效，防止恢复到其他账号。合并导入仅新增，覆盖恢复优先通过数据库事务函数完成。草稿不进入该队列，而是保留最新本地版本并在恢复联网、页面回到前台或下一次同步时重新仲裁。

同步期间如果本地历史发生保存、删除或导入，控制器拒绝应用这次请求返回的旧列表并立即重新同步。在线账号订阅 `inspection_records` 和 `inspection_drafts` 的 Postgres Changes，其他设备写入后触发重新拉取；重连和回到前台仍会完整补查，实时通知不作为唯一数据来源。

失败的历史同步按 1、3、10、30 秒退避重试，恢复联网或回到前台时立即重新启动。页面显示当前账号的队列待处理数量以及最近一次成功同步时间；草稿使用独立的版本仲裁流程，因此不计入历史操作队列数量。

生产构建在静态导出后由 `scripts/generate-service-worker.mjs` 为首页和 `_next/static` 等必要资源生成版本化缓存。`src/app/service-worker-registration.tsx` 按构建时的 `PAGES_BASE_PATH` 注册，导航请求在线优先、断网回退到已缓存首页；Supabase 请求不由 Service Worker 处理。新缓存完整安装后才替换旧缓存。账号离线重开时只读取上次已验证账号的本地标识，显式退出即清除；恢复联网后重新检查 Supabase 会话。

离线账号标识由 `features/auth/storage/offline-identity.ts` 独立保存到 `night-inspection-offline-identity`，仅包含用户 ID、邮箱和邮箱验证时间；它不替代 Supabase 会话，也不改变巡检记录和草稿的既有存储键。

用户偏好的导航顺序和头像路径分别更新，避免修改导航时把另一设备的新头像路径写回旧值。离线导航变更在缓存中记录具体待同步字段；较旧请求返回时通过本地修订号阻止它覆盖后续操作。

## 数据库迁移基线

同步动画：Realtime 通知及同步期间排队的补查调用后台模式，不重新设置 `syncing`，避免本设备写入回推造成第二次旋转。初次加载、主动上传、手动同步和错误重试仍显示同步状态；后台失败仍进入错误处理，数据仲裁和补查不受影响。

新环境必须按文件名顺序执行 `supabase/migrations/` 下的全部迁移。当前最后一份迁移是 `20260906170915_reliable_inspection_sync.sql`：它创建 `replace_inspection_records(uuid, jsonb)` 事务函数，对覆盖恢复的载荷、记录归属和重复 ID 做校验，并把 `inspection_records`、`inspection_drafts` 加入 `supabase_realtime` publication。函数使用调用者权限并仅向 `authenticated` 授予执行权；客户端仍受现有 RLS 限制。

生产 Supabase 已执行该迁移；该同步流程的功能基线为 `cbb008c`，不代表当前全部界面的最新提交。代码保留仅针对 `PGRST202`（数据库尚未暴露新 RPC）的滚动发布兼容路径，新建环境不应依赖该回退替代迁移。

## 密码修改与跨设备会话撤销

账号内改密和邮件找回重设密码共用同一套会话撤销流程：密码更新成功后先通过 Supabase Auth 撤销其他会话，再把当前时间和发起会话 ID 写入 `user_preferences.sessions_revoked_at`、`sessions_revoked_by`。当前会话根据会话 ID 保持登录，其他设备收到 Realtime 变更后执行本地登出。

`src/features/auth/hooks/use-auth.ts` 负责订阅当前用户的 `user_preferences` 变更，并在首次加载、恢复联网和页面重新回到前台时补查撤销标记。因此在线设备可及时退出，离线或后台设备会在恢复后退出。该表继续使用现有 RLS 按 `auth.uid() = user_id` 隔离；不要改成全局广播，也不要使用 `user_metadata` 做授权判断。

## 修改原则

1. 设备清单和显示规则修改在 `model/config.ts` 与 `model/field-rules.ts` 完成。
2. 完整性检查修改在 `model/validation.ts` 完成。
3. `hooks/use-inspection-controller.ts` 只组合公共状态、草稿编辑与同步；历史流程进入 `use-inspection-history.ts`，备份流程进入 `use-inspection-backup.ts`。
4. 页面视觉修改限定在对应业务组件，并继续消费 `globals.css` 中的语义令牌。
5. 通用控件优先扩展 `components/ui`；只有巡检业务使用的组件留在 `features/inspection/components`。
6. 草稿冲突规则修改在 `model/draft-reconciliation.ts` 完成，并同步扩展 `tests/draft-version.test.mjs`。
7. 历史操作队列修改在 `sync/inspection-sync-queue.ts` 完成，并同步扩展 `tests/inspection-sync-queue.test.mjs`；网络读写留在 `sync/inspection-cloud-sync.ts`，纯数据库映射和行校验在 `sync/inspection-cloud-mapping.ts`。
8. 每次修改后运行 `npm run lint`、`npx tsc --noEmit`、`npm test` 和生产构建。
9. 品牌图形只修改 `design/brand/night-inspection-master.svg`，随后按 `design/brand/README.md` 同步导出 favicon、Apple、登录页、PWA 普通及 Maskable 资源；不得直接把历史归档文件接入运行时。

## 职责扩展点

- `use-inspection-controller` 继续持有草稿/记录修订号、请求互斥、补跑、上传防抖和重试状态；`use-inspection-sync-events` 仅负责 online、visibilitychange、Realtime 的注册与清理，回调仍进入控制器的同一个 `syncNow`。新增外部触发源进入这个内部 hook，不另建同步状态。
- `inspection-storage.getStoredInspectionDraft` 统一从归一化存储状态重建草稿，保留 hasDraft、legacy 无版本和空白版本的区别；`model/validation` 提供备份与云端共同使用的领域载荷校验。格式升级仍从 storage 开始。
- `inspection-cloud-mapping` 只转换字段，不决定新增、恢复或删除策略。insert-only、墓碑、事务恢复和 PGRST202 回退仍由原同步模块控制。
- `account/components/navigation-order-editor` 拥有排序草稿、长按拖动和提交；`avatar-visual` 供账号菜单与首页共用。业务组件不进入公共 UI。
- `account/sync/prepare-avatar` 只处理浏览器图片读取、裁切和压缩；`use-user-preferences` 继续持有 revision、signed URL 恢复与字段同步编排。头像提交后的导航 pending 缓存由 `storage/user-preferences-storage.ts` 的 `cachePreferencesAfterAvatarCommit` 统一保留。
- Auth 表单/错误/校验已有稳定分工，历史和备份已有独立 hook 与局部面板，无需为行数继续拆分。完整审计与验证边界见 `GOVERNANCE.md`。
