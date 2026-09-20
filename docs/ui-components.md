# 公共 UI 与交互

新增或修改同类 UI 时先复用下表组件。布局差异使用已有语义参数或插槽；需要调整共同表现时修改公共实现并检查全部调用方，不复制样式到业务页面。

| 类型 | 公共实现 | 当前使用位置 |
| --- | --- | --- |
| 底部弹窗 | `src/components/ui/sheet.tsx` | 账号、修改密码、账号确认、备份、删除、保存校验 |
| 弹窗标题 | `src/components/ui/dialog-heading.tsx` | 账号、账号确认、备份、删除、保存校验 |
| 凭据标题 | `src/features/auth/components/credential-heading.tsx` | 登录/注册/重置入口、修改密码 |
| 内容区标题 | `src/features/inspection/components/section-heading.tsx` | 8#、9#、皮带、历史、巡检汇总 |
| 凭据表单 | `src/features/auth/components/credential-form.tsx` | 登录/注册/重置表单、修改密码 |
| 带图标输入框 | `src/components/ui/text-field.tsx` | 邮箱、所有密码输入框 |
| 密码显示切换 | `src/features/auth/components/password-field.tsx` | 登录/注册/重置、修改密码 |
| 表单错误提示 | `src/components/ui/form-error.tsx` | 凭据表单、邮箱验证状态 |
| 字段错误与重复抖动 | `src/hooks/use-field-feedback.ts` | 认证表单、修改密码 |
| 顶部主导航 | `src/features/inspection/components/inspection-tabs.tsx` | 8#、皮带、9#、历史记录 |
| 皮带选择 | `src/features/inspection/components/belt/belt-tabs.tsx` | SZ101、SZ201、SZ201-N |
| 图标操作项 | `src/components/ui/action-tile.tsx` | 修改密码入口、导出/导入备份 |
| 清空按钮 | `src/components/ui/clear-button.tsx` | 泵区域、皮带区域 |
| 基础按钮与卡片 | `src/components/ui/button.tsx`、`card.tsx` | 全项目通用 |

## 调用约定

- `Sheet` 在调用方的 `AnimatePresence` 中使用；`labelledBy` 必须对应实际标题 ID。嵌套弹窗放在父 `Sheet` 的 `overlays` 插槽中，避免进入父弹窗的滚动和变换容器。提交中传入 `busy`，业务按钮继续使用 `disabled`。退出中的面板由公共组件统一禁止交互。外层/嵌套动画、安全区、背景和滚动容器统一在这里维护。
- `TextField` 负责标签、输入框样式、错误关联、错误占位和抖动；`PasswordField` 只组合密码可见性和眼睛按钮。`belowAction` 用于忘记密码等附加操作。
- `useFieldFeedback.report(errors)` 替换字段错误，递增出错字段的动画序号，并返回是否存在错误。输入变化调用 `clear(field)`；切换表单模式调用 `reset()`。通用密码校验仍使用 `auth-validation.ts`。
- `InspectionTabs` 统一顶部 4 个主导航项，使用蓝色选中态和 `aria-current`。`BeltTabs` 统一下方 3 个皮带选项，使用白色选中态、项间距和 `aria-pressed`。两组视觉与交互独立维护。
- 样式继续消费 `src/app/globals.css` 的设计变量。`field-shake` 的动画和减少动态效果规则只在这里定义一次。
- 巡检数据规则、存储、云同步、密码提交、导入导出和具体确认动作保留在各业务模块中。

## 验证

运行 `npm run lint`、`npx tsc --noEmit`、`npm test` 和 `npm run build`。`tests/shared-ui.test.mjs` 检查公共组件的错误关联、选择语义、嵌套结构和表单结构；动画与关闭行为还需浏览器检查。
