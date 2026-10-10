# 数据与同步

本文件集中维护数据格式、兼容读取、冲突与账号隔离。使用流程见 [业务规则](./inspection-rules.md)，模块分工见 [架构](../ARCHITECTURE.md)，初始化步骤见 [开发与发布](./development.md)。

## 记录与备份格式

类型定义在 [types.ts](../src/features/inspection/model/types.ts)：

```ts
type InspectionRecord = {
  id: string;
  date: string;
  time: string;
  createdAt?: string;
  values: Record<string, string>;
};
type InspectionDraft = {
  values: Record<string, string>;
  beltTab: "SZ101" | "SZ201" | "SZ201-N";
  updatedAt?: string;
};
```

新记录生成 ISO `createdAt`；它仅在读取历史记录时允许缺失。`record-time.ts` 从旧完整填写时间归一化时间戳，用于排序和云端 `recorded_at` 映射，不修改原始 `date` / `time`。草稿真实编辑生成版本化 `updatedAt`。

备份格式为 `{ app: "night-inspection", schemaVersion: 1, exportedAt, records }`，仍接受旧原始记录数组。导入检查非空 ID/日期/时间、字符串 values 和可选合法 `createdAt`，按 UUID 去重。解析、归一化与排序集中在 [inspection-backup.ts](../src/features/inspection/storage/inspection-backup.ts)。

## 浏览器存储

| 键或前缀 | 管理模块与用途 |
| --- | --- |
| `night-inspection` | inspection/storage：当前历史记录 |
| `night-inspection-draft` | inspection/storage：当前草稿 |
| `night-inspection-owner`、`night-inspection-account:{user_id}` | inspection/storage：工作区归属与按账号缓存 |
| `night-inspection-last-backup`、`night-inspection-import-undo` | inspection/storage：导出时间和有效期恢复快照 |
| `night-inspection-sync-queue:{user_id}` | inspection/sync：持久化历史操作队列 |
| `night-inspection-appearance` | [lib/appearance.ts](../src/lib/appearance.ts)：当前设备的外观偏好 |
| `night-inspection-offline-identity` | auth/storage：上次已验证账号的离线标识 |
| `night-inspection-preferences:{user_id}`、`night-inspection-avatar-url:{user_id}` | account/storage：偏好待同步字段与头像 URL 缓存 |

外观偏好只存 `system` / `light` / `dark`，首次、非法值和删除该键均回到 system；存储受限时仅当前会话生效。它独立于登录账号，不进入巡检备份、账号缓存、退出清理或 Supabase 表；切换与订阅见 [公共 UI](./ui-components.md#外观基础)。

草稿当前保存完整对象，读取时继续兼容仅有 values 的格式。`StoredInspectionState.hasDraft` 区分空白草稿与无草稿，不能按 values 是否有键判断。队列读取时给无 operationId 的项补稳定 ID；账号偏好保留旧 pending 格式读取。

首次账号登录接管未归属的本机数据；之后切换账号保存前一账号缓存，再加载目标账号缓存并清除工作区的恢复快照与备份时间。组件不直接操作这些键。字段或格式升级先在专属存储层增加归一化/迁移。

## 草稿仲裁

```text
真实编辑 → 严格递增 updatedAt → 立即保存本地与账号缓存
        → 800ms 防抖上传 → RPC 比较版本 → 被拒绝则重新拉取
```

- 无本地草稿时采用云端；无版本本地草稿不能覆盖已有云端草稿。
- 较新版本胜出，相同时间采用已确认云端副本；连续编辑至少比上一版本增加 1ms。
- `upsert_inspection_draft_if_newer` 保护服务端写入；拒绝旧写入后重新读取最新云端。
- 新建的空白草稿也有版本，因此清空可同步。草稿不进入历史操作队列，防抖等待中的草稿不计入队列数量。

仲裁实现为 `model/draft-reconciliation.ts`。上传遇到正在运行的历史同步时等待并重试，控制器保留请求互斥与修订保护。

## 历史同步

保存、删除、撤销删除、合并与覆盖恢复先写本地，再进入当前账号的持久化队列。每项有稳定 operationId，网络成功只确认对应项；请求期间追加项不能被清空。控制器先冲刷队列，再分批拉取云端。

- 普通新增和合并使用 insert-only，不复活 `deleted_at` 墓碑。
- 删除传播墓碑；撤销删除的 restore 按队列顺序清除指定记录墓碑，只恢复本次集合。
- 覆盖及恢复撤销使用 `replace_inspection_records`，事务恢复目标集合并软删除其余活动记录。
- 仅遇到 `PGRST202` 保留滚动发布兼容路径；新环境应执行完整迁移，不能依赖非事务回退作为正常方案。
- 请求期间本地记录修订号变化时，丢弃旧返回列表并重新同步。

失败按 1、3、10、30 秒退避，后续使用 30 秒间隔；恢复联网和回到前台立即补查。`inspection_records` / `inspection_drafts` Realtime 只触发重新拉取，不能替代完整补查。本机写入回推与排队补查走后台同步，不重复触发同步旋转；初次加载、主动提交、手动同步及错误重试保留状态反馈。

首页待同步数来自当前账号历史队列，成功时间是最近一次完成同步的时间。状态文案在 `night-inspection-app.tsx`，不要在文档复制另一套固定文案。

## 偏好与私有头像

四个导航项必须各出现一次，第一项是启动页面。导航顺序和头像路径分别提交，以更新时间条件和本地 revision 防止旧请求覆盖另一字段或后续操作；头像提交后的缓存写入保留导航 pending。

头像在私有 `avatars` bucket 的 `{user_id}/` 路径，上传使用新 UUID 文件名。图片限制 8MiB，居中裁切为 256×256 WebP，质量 0.82。签名 URL 有效一小时，本地缓存最长 55 分钟；预加载限时 10 秒，仅成功后替换当前显示，无效缓存清除。

偏好/头像恢复启动后立即尝试，失败再按 1、3、10 秒进行有限重试；恢复联网与回到前台可重新启动一轮。该有限重试与巡检队列的持续退避不同。实现位于 `use-user-preferences.ts` 和 `account/sync/`。

## 认证与会话

配置 Supabase 后邮箱账号进入认证流程；未配置则本地运行。密码使用原生 password/text 显隐，注册和邮件恢复的新密码要求重复确认，邮箱验证邮件支持 60 秒重发冷却。

账号改密先验证当前密码；邮件恢复通过 `PASSWORD_RECOVERY` 设置新密码。成功后撤销其他 Supabase 刷新会话，并写 `user_preferences.sessions_revoked_at` / `sessions_revoked_by`。当前 session ID 保持登录，其他设备由 Realtime 或首次加载、恢复联网、回前台补查后执行本地登出。

离线标识只含已验证账号 ID、邮箱和验证时间，不是认证令牌或权限凭据。显式退出清除标识，恢复联网重新核验会话。

浏览器仅使用 publishable key（保留 anon key 兼容），不得使用 service_role；`NEXT_PUBLIC_` 变量会进入客户端。表和私有 Storage 策略按当前用户归属限制数据，授权不能依赖可编辑 user_metadata。权限与 RPC 以仓库迁移为准，不能为了消除告警删除现有 RLS 或事件触发器。

## 离线资源

`generate-service-worker.mjs` 在静态导出后生成版本缓存；`service-worker-registration.tsx` 按构建 basePath 注册。导航在线优先，断网回退缓存首页；同源清单静态资源优先缓存。Supabase 请求与账号数据不进入 Service Worker 缓存。

新资源完整安装后才替换旧缓存。首次访问、首次账号登录或清理站点数据后仍需网络；部署不会主动迁移或清空用户浏览器数据。
