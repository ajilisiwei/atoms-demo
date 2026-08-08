@AGENTS.md

# UI 规范 (UI Conventions)

## 禁用浏览器原生弹窗与控件 (No native browser popups/widgets)

用户可见的 UI 一律使用项目统一样式的组件，禁止浏览器自带的弹窗和默认样式控件：

| 禁止 | 替代 |
|---|---|
| `alert()` / `confirm()` | `ConfirmDialog` (`src/components/ConfirmDialog.tsx`) |
| `prompt()` | `InputDialog` (`src/components/InputDialog.tsx`) |
| 原生 `<select>` 下拉 | 自定义浮层下拉（参考 `ThemePicker` / `StudioThemeSelect` 的模式：按钮 + absolute/fixed 浮层 + document mousedown 关闭 + Esc） |
| 原生 tooltip 之外的浮层交互 | 项目浮层模式（`bg-panel border-line rounded-2xl shadow-xl`） |

例外：`<input type="color">` 与 `<input type="file">` 的原生拾取器可用（无样式一致性方案），但触发按钮本身必须是项目样式。

设计 token（Tailwind 类）：`bg-background / bg-panel / bg-panel-2 / border-line / text-foreground / text-muted / text-accent-2 / bg-accent`，不要写裸色值。
