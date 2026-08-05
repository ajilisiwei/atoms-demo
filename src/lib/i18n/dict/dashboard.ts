// Dashboard strings (home, my apps) + composer, theme picker and auth screens.
export const dashboardDict: Record<string, { en: string; zh: string }> = {
  // Dashboard home
  "dashboard.heroTitle": {
    en: "What will you create, {name}?",
    zh: "你想创造什么，{name}？",
  },
  "dashboard.composerPlaceholder": {
    en: "Describe the app you want to build…",
    zh: "描述你想构建的应用…",
  },
  "dashboard.creating": {
    en: "Creating your project…",
    zh: "正在创建项目…",
  },
  "dashboard.myApps": { en: "My apps", zh: "我的应用" },
  "dashboard.blankProject": { en: "+ Blank project", zh: "+ 空白项目" },
  "dashboard.creditsPillTitle": {
    en: "Credits — open details",
    zh: "积分 — 查看详情",
  },
  "dashboard.deleteConfirm": {
    en: 'Delete "{name}"? This cannot be undone.',
    zh: "确定删除“{name}”？此操作无法撤销。",
  },
  "dashboard.createFailed": {
    en: "Failed to create project",
    zh: "创建项目失败",
  },
  "dashboard.deleteFailed": {
    en: "Failed to delete project",
    zh: "删除项目失败",
  },
  "dashboard.emptyHint": {
    en: "No apps yet — describe one above to get started.",
    zh: "还没有应用 — 在上方描述一个即可开始。",
  },

  // Prompt composer + theme picker
  "composer.send": { en: "Send prompt", zh: "发送提示词" },
  "composer.theme": { en: "Theme", zh: "主题" },
  "composer.searchThemes": { en: "Search themes…", zh: "搜索主题…" },
  "composer.noTheme": { en: "No theme", zh: "无主题" },
  "composer.defaultThemes": { en: "Default themes", zh: "默认主题" },
  "composer.noThemesMatch": {
    en: "No themes match.",
    zh: "没有匹配的主题。",
  },

  // Auth (login / register)
  "auth.createTitle": { en: "Create your account", zh: "创建你的账户" },
  "auth.loginTitle": { en: "Welcome back", zh: "欢迎回来" },
  "auth.createSubtitle": {
    en: "Start building apps from a sentence.",
    zh: "从一句话开始构建应用。",
  },
  "auth.loginSubtitle": {
    en: "Log in to continue building.",
    zh: "登录以继续构建。",
  },
  "auth.email": { en: "Email", zh: "邮箱" },
  "auth.password": { en: "Password", zh: "密码" },
  "auth.passwordWithHint": {
    en: "Password (8+ characters)",
    zh: "密码（至少 8 个字符）",
  },
  "auth.logIn": { en: "Log in", zh: "登录" },
  "auth.createAccount": { en: "Create account", zh: "创建账户" },
  "auth.pleaseWait": { en: "Please wait…", zh: "请稍候…" },
  "auth.haveAccount": {
    en: "Already have an account?",
    zh: "已有账户？",
  },
  "auth.newTo": { en: "New to Atomlet?", zh: "初次使用 Atomlet？" },
  "auth.createAccountLink": { en: "Create an account", zh: "创建账户" },
  "auth.genericError": {
    en: "Something went wrong, please retry",
    zh: "出错了，请重试",
  },
  "auth.oauthError": {
    en: "Social sign-in failed — please try again or use email",
    zh: "第三方登录失败 — 请重试或改用邮箱登录",
  },
  "auth.oauthEmailError": {
    en: "Your social account has no verified email — use email sign-in instead",
    zh: "你的第三方账户没有已验证的邮箱 — 请改用邮箱登录",
  },

  // OAuth buttons
  "auth.orContinueWith": {
    en: "or continue with",
    zh: "或通过以下方式继续",
  },
  "auth.continueWith": {
    en: "Continue with {provider}",
    zh: "使用 {provider} 继续",
  },
};
