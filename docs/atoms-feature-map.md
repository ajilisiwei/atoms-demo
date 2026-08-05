# Atoms 功能梳理与 Demo 对齐清单

> 基于 2026-08-05 对 atoms.dev（已登录账号）的实地浏览研究。
> 状态：✅ demo 已有 ｜ 🔨 本分支实现 ｜ 🧭 可实现·暂缓 ｜ ❌ 超出 demo 范围

## 1. Atoms 核心界面结构

### Dashboard（/dashboard）
| Atoms 功能 | 说明 | Demo 状态 |
|---|---|---|
| 左侧边栏 | Logo、工作区切换器、导航（首页/资源/我的项目）、"最近"项目、社区/积分卡片、底部头像+设置+通知 | 🔨 简化版：Logo、导航、最近项目、底部用户区 |
| Hero 大标题 | "你想创造什么，David Dai?"（serif 混排、个性化称呼） | 🔨 |
| 中央输入框 | 多行输入 + 「+」附件 + **主题下拉** + 构建模式下拉 + 语音 + 圆形发送钮 | 🔨（附件/语音除外） |
| 主题下拉 | 搜索 + 预置主题列表（名称+四色点）+ 新建 + 管理器入口 | 🔨 核心 |
| 构建模式 | 构建（通用）/ 目标（规划并持续构建） | 🧭 单模式即可 |
| 连接器条 | "将你的工具连接到 Atoms"（Supabase/GitHub/Stripe…） | ❌ 无真实集成场景 |
| 发现/模板区 | 社区项目瀑布流、模板库 | ✅ Discover 页：全站已发布应用实时缩略墙 + 一键 Remix |
| 积分余额 | 右上角余额 pill | ❌ 无计费体系 |

### 主题管理器（本次复刻核心）
| Atoms 功能 | 说明 | Demo 状态 |
|---|---|---|
| 预置主题库 | Zen / Terracotta & Clay / Notion / Material You / Golden Hour / Nordic Moss & Stone / White Beach / Dreamy and vibrant / Pure Craft / Ink & Parchment / Swiss Modernism / Industrial Fallout / Antique Press / Hyper-dark | 🔨 预置 8 个自命名主题 |
| 颜色 tokens | shadcn 风格：Background/Foreground、Card、Popover、Primary、Secondary…（成对前景/背景） | 🔨 简化为 8 个核心 token |
| 字体 tokens | 衬线 / 无衬线 / 等宽 三族选择 | 🔨 每主题内置字体建议 |
| 效果 tokens | 圆角 slider、阴影（颜色/透明度/模糊/扩散/偏移） | 🔨 圆角档位，阴影并入风格描述 |
| 实时预览 | 右侧示例组件（卡片/图表/登录表单）随 token 变化 | 🔨 下拉内色板预览；管理器级预览 🧭 |
| 亮暗预览切换 / 撤销重做 / 导入导出 | 编辑器工具条 | 🧭 |
| 自定义主题（新建/保存） | 用户主题入库 | 🧭 数据模型已预留 |
| **作用机制** | 选中主题 → 生成的应用遵循该主题的色板/字体/圆角 | 🔨 tokens 注入生成 prompt |

### Builder / Chat 页
| Atoms 功能 | 说明 | Demo 状态 |
|---|---|---|
| 左 Chat + 右预览布局 | 左约 1/3 对话，右 2/3 应用查看器 | ✅ 已一致 |
| 版本卡片内嵌对话流 | "版本 1 · 更新完成"高亮卡片，可点击切换 | 🔨 |
| **AI 快捷建议 chips** | 生成完成后给出 "Add 用户进度保存" 等 3 个迭代建议，点击即发送 | 🔨 协议加 SUGGESTIONS 段 |
| 预览工具条 | 设备宽度切换 / 刷新 / 路由下拉 / 新窗口打开 / 控制台 | 🔨（路由/控制台除外） |
| 消息操作 | 复制/点赞/点踩 | 🧭 |
| 分享 / 发布 | 右上角主按钮 | ✅ 发布已有 |
| Agent 计划时间线 | 流式展示构建步骤 | ✅ 已有（Atoms 亦有类似过程展示） |

### 账户与设置
| Atoms 功能 | 说明 | Demo 状态 |
|---|---|---|
| 用户菜单 | 头像弹出：设置/套餐/个人主页/兑换/**外观(亮暗子菜单)**/帮助/退出登录 | 🔨 设置+外观+退出 |
| 设置弹窗 | 左导航（Project/工作区/账户/支持）+ 右面板（默认模型/权限/提示音等） | 🔨 简化：账户/外观/模型信息 |
| **外观切换** | 亮色 / 暗色（平台自身 UI） | 🔨 亮/暗/跟随系统 |
| 多工作区/成员 | 组织与协作 | ❌ 超出范围 |
| 套餐/积分/钱包 | 商业化 | ❌ |
| Google/GitHub 登录 | OAuth | 🔨 骨架落地（见下） |

## 2. "主题"功能的 Demo 实现设计

- `src/lib/themes.ts`：预置主题（id、名称、四色预览、完整 tokens、字体族、圆角、风格描述）
- 输入框 ThemePicker 下拉：搜索 + 色点列表 + 选中态（Atoms 同款交互）
- `Project.themeName` 落库；生成请求携带主题 → server 在 system prompt 注入
  THEME 段（hex 色板 + 字体 + 圆角 + 风格指令），生成的应用即遵循主题
- 多轮迭代保持主题一致（每轮都注入当前项目主题）

## 3. Google / GitHub 登录可行性结论

**可以实现。** 方案：不引入重框架，在现有 JWT session 上扩展标准 OAuth 2.0 授权码流程：

- `GET /api/auth/oauth/github` → 跳转 GitHub authorize（state 防 CSRF）
- `GET /api/auth/oauth/github/callback` → code 换 token → 拉取用户 email →
  upsert User + OAuthAccount(provider, providerAccountId) → 复用 createSession
- Google 同构（openid email profile scope，issuer accounts.google.com）
- 数据模型：新增 `OAuthAccount` 表，User.passwordHash 改可空（纯 OAuth 用户）

前置条件（需要账号所有者操作）：
1. GitHub：Settings → Developer settings → OAuth Apps 创建，回调
   `https://atoms-demo-phi.vercel.app/api/auth/oauth/github/callback`，
   得到 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
2. Google：GCP Console → OAuth consent screen（External+测试用户）→ 凭据，
   回调同构；国内直连 Google 有网络限制，演示环境建议以 GitHub 为主
3. 凭据配入 Vercel 环境变量后按钮自动出现（未配置时自动隐藏，不影响现有邮箱登录）

本分支已落地代码骨架（路由 + 按钮 + 数据模型），配好凭据即生效。
