# 数据与同步

本文件维护数据契约、持久化、同步与兼容性。模块职责见[架构](../ARCHITECTURE.md)，数据库准备见[开发与发布](./development.md)。

## 品牌名称与兼容标识

用户可见品牌为“云速巡检”，导出文件名使用该名称。备份 app 标识、night-inspection 系列存储键和缓存前缀继续沿用；内部组件与资源文件名不因改品牌而重命名。

品牌展示与历史数据标识分开维护，改名不迁移或清空用户数据。品牌资源入口见[品牌文档](../design/brand/README.md)。

## 记录与备份格式

类型定义见 [types.ts](../src/features/inspection/model/types.ts)。

| 对象 | 核心字段与约束 |
| --- | --- |
| 记录 | id、date、time、values；新记录含 ISO createdAt，旧记录可缺失 |
| 草稿 | values、beltTab、可选 updatedAt；真实编辑产生严格递增版本 |
| 备份 | `{ app: "night-inspection", schemaVersion: 1, exportedAt, records }` |

values 是字符串字典。记录导入检查非空字符串 ID/日期/时间、values 和可选合法 createdAt；按 ID 去重，不按文件名识别，也不强制旧 ID 为 UUID。新建记录使用 UUID，导入继续接受旧原始记录数组。

旧完整填写时间由 record-time.ts 归一化，用于排序和云端 recorded_at，不改原始 date/time。解析、归一化与合并集中在 [inspection-backup.ts](../src/features/inspection/storage/inspection-backup.ts)。

## 浏览器存储

| 键或前缀 | 用途 / 所属模块 |
| --- | --- |
| night-inspection、night-inspection-draft | 当前记录和草稿 / inspection/storage |
| night-inspection-owner、night-inspection-account:{user_id} | 工作区归属与账号缓存 / inspection/storage |
| night-inspection-last-backup、night-inspection-import-undo | 导出时间与恢复快照 / inspection/storage |
| night-inspection-sync-queue:{user_id} | 持久化历史操作队列 / inspection/sync |
| night-inspection-preferences:{user_id}、night-inspection-avatar-url:{user_id} | 账号偏好待同步字段、签名 URL 缓存 / account/storage |
| night-inspection-offline-identity | 离线身份 / auth/storage |
| night-inspection-appearance | system/light/dark 设备偏好 / lib/appearance |

Supabase SDK 另行持久化认证会话。设备外观不参与账号云同步；巡检记录和队列依赖浏览器存储，不能将外观的内存回退视为全应用存储保证。

首次登录接管未归属本机数据；切换账号先保存旧账号缓存，再加载新账号并清除工作区恢复快照和导出时间。

### 兼容读取

必须保留：

- 仅有 values 的旧草稿，以及区分“空白草稿”和“无草稿”的 hasDraft。
- 旧记录未知字符串字段，包括已移除的 water 字段；不按当前表单裁剪数据。
- 缺少 operationId 的历史队列迁移和旧 pending 偏好读取。
- 备份原始数组及现有版本格式。

格式或键变更应先设计归一化和迁移，再验证原数据。组件不直接分散读写存储键。

## 草稿仲裁

```text
编辑 → 严格递增 updatedAt → 本地与账号缓存
     → 800ms 防抖上传 → RPC 比较版本 → 拒绝旧写入后重新拉取
```

较新版本胜出，相同时间采用已确认云端副本；无版本本地草稿不能覆盖已有云端草稿。空白草稿也有版本。实现见 [draft-reconciliation.ts](../src/features/inspection/model/draft-reconciliation.ts)。

草稿不进入历史操作队列。控制器维护请求互斥、修订保护和待上传快照，避免旧返回覆盖后续编辑。

## 历史同步

先本地提交，再进入当前账号队列。每项有稳定 operationId，成功只确认该项，不能清除请求期间追加的操作。控制器先冲刷队列，再按 ID 游标分批拉取云端记录与墓碑，最后仲裁草稿。

| 操作 | 云端规则 |
| --- | --- |
| 保存、合并 | insert-only，不复活已删除墓碑 |
| 删除 | 写 deleted_at 墓碑 |
| 撤销删除 | 按队列顺序恢复指定集合 |
| 覆盖、撤销恢复 | replace_inspection_records 事务恢复目标集合并软删除其余活动记录 |

仅 PGRST202 保留 RPC 滚动发布回退，新环境必须执行完整迁移。请求期间本地修订发生变化时丢弃旧返回并补查。

失败按 1、3、10、30 秒退避，后续保持 30 秒；联网和回到前台补查。Realtime 触发重新拉取，不能代替完整同步。本机事件回推走后台同步，主动操作保留状态反馈。

首页待同步数只表示历史队列项数，不包含防抖中的草稿；最近成功时间不代表所有新编辑已上传。

## 偏好与头像

导航顺序与头像路径分别写入，以更新时间条件和本地 revision 防止旧请求覆盖后续编辑；头像提交不能误确认导航待同步字段。

头像使用私有 avatars bucket 下的 user_id 路径和新 UUID 文件名。上传限制 8MiB，居中裁切为 256×256 WebP；签名 URL 一小时，本机缓存最长 55 分钟，预加载成功才替换显示。

偏好/头像恢复立即尝试，失败按 1、3、10 秒有限重试，联网或回前台可重启一轮；区别于巡检队列持续退避。实现见 account 的 hooks、storage、sync。

## 认证与权限

配置完整时启用邮箱认证，客户端保留会话、自动刷新并识别邮件回跳。账号改密先验证当前密码；邮件恢复与账号改密成功后撤销其他刷新会话，并写 sessions_revoked_at / sessions_revoked_by。

客户端通过 JWT session_id 和 iat 检查撤销标记，在 Realtime、初始化、联网和回前台时登出旧会话；这不等同于立即使所有已有 access token 失效。

离线身份仅保存先前会话的 ID、邮箱和可选验证时间，不是令牌。网络不可用或可重试认证网络错误可恢复对应本机数据；正常无会话、不可重试认证失败及退出会清除标识。

浏览器仅使用 publishable key（保留 anon key 兼容），不得使用 service_role；NEXT_PUBLIC 变量进入客户端。表、私有 Storage 和 RPC 按当前用户归属限制访问，不能依赖可编辑 user_metadata 授权。实际权限以仓库迁移为准。

## 离线资源

生产构建生成版本 Service Worker，按 basePath 注册。导航在线优先、失败回退缓存首页；清单中的同源静态资源优先缓存，Supabase 请求与账号数据不进入资源缓存。

清单包含首页、manifest、图标及 _next/static，不含分享 PNG。完整安装后等待浏览器生命周期激活，再清理同一作用域旧缓存；当前不强制 skipWaiting。首次访问和首次登录仍需网络，离线持久性依赖浏览器保留站点数据。
