# 公共 UI 与交互

项目中的重复 UI 和交互统一提取为公共可复用组件。相同类型的界面必须从公共组件调用，禁止在业务页面复制一套近似实现；后续修改公共实现一处，应同步影响全部使用位置。

## 组件化原则

- 先识别重复的结构、视觉和交互，再选择 `src/components/ui`、跨业务 feature 组件或业务内部组件作为唯一实现位置。
- 同类组件的布局差异通过语义化属性、variant 或插槽表达，不通过复制组件后分别维护。
- 公共组件负责通用结构、样式、可访问性和交互状态；数据规则、提交请求、存储和业务判断留在调用方。
- 修改公共组件前检查全部调用位置；修改后验证所有使用页面，确保“一处修改、全部同步”。
- 视觉相似但职责不同的组件保持分组独立。例如顶部 4 项主导航与下方 3 项皮带选择分别由 `InspectionTabs` 和 `BeltTabs` 维护，不合并为一个含大量条件的万能组件。

## 公共组件清单

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

- `Sheet` 在调用方的 `AnimatePresence` 中使用；`labelledBy` 必须对应实际标题 ID。嵌套弹窗放在父 `Sheet` 的 `overlays` 插槽中，避免进入父弹窗的滚动和变换容器。提交中传入 `busy`，业务按钮继续使用 `disabled`。页面滚动锁定、顶层焦点限制、`Esc` 关闭和退出中的交互禁用由公共组件统一处理；退出开始时清除弹窗内部焦点，关闭后也不主动恢复触发按钮的焦点，避免退场期间或关闭后出现可见焦点框。嵌套弹窗打开时父面板自动进入 `inert` 和 `aria-hidden` 状态。外层/嵌套动画、安全区、背景和滚动容器也统一在这里维护。
- `TextField` 负责标签、输入框样式、错误关联、错误占位和抖动；`PasswordField` 只组合密码可见性和眼睛按钮。`belowAction` 用于忘记密码等附加操作。
- `PasswordField` 保留原生密码输入语义，通过 `type="password"` / `type="text"` 切换显隐。当前不采用 `-webkit-text-security` CSS 遮罩方案；该方案无法保证密码管理器、iOS 安全键盘和辅助功能与原生密码框一致，未完成真机验收前不得重新引入。
- `useFieldFeedback.report(errors)` 替换字段错误，递增出错字段的动画序号，并返回是否存在错误。输入变化调用 `clear(field)`；切换表单模式调用 `reset()`。通用密码校验仍使用 `auth-validation.ts`。
- `InspectionTabs` 统一顶部 4 个主导航项，使用蓝色选中态和 `aria-current`。`BeltTabs` 统一下方 3 个皮带选项，使用白色选中态、项间距和 `aria-pressed`。两组视觉与交互独立维护。
- 样式继续消费 `src/app/globals.css` 的设计变量。`field-shake` 的动画和减少动态效果规则只在这里定义一次。
- 组合 Tailwind 类名统一使用 `src/lib/utils.ts` 的 `cn()`。项目自定义字号 `text-label`、`text-caption`、`text-body`、`text-card-title` 和 `text-title` 已注册为字号类，必须与 `text-destructive`、`text-muted-foreground` 等颜色类同时保留。新增 `--text-*` 字号变量时，必须同步扩展 `cn()` 的 `font-size` 分组并补充回归测试，避免字号类被 `tailwind-merge` 误判为颜色类后删除。
- 巡检数据规则、存储、云同步、密码提交、导入导出和具体确认动作保留在各业务模块中。

## 验证

运行 `npm run lint`、`npx tsc --noEmit`、`npm test` 和 `npm run build`。`tests/shared-ui.test.mjs` 检查自定义字号与文字颜色能同时保留，以及公共组件的错误关联、选择语义、嵌套结构和表单结构；动画、实际计算字号、焦点循环、关闭后焦点状态、`Esc` 关闭和滚动锁定还需浏览器检查。
