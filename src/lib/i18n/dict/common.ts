// Generic + settings-dialog strings shared across the app.
export const commonDict: Record<string, { en: string; zh: string }> = {
  // Settings dialog chrome
  "settings.title": { en: "Settings", zh: "设置" },
  "settings.account": { en: "Account", zh: "账户" },
  "settings.credits": { en: "Credits", zh: "积分" },
  "settings.appearance": { en: "Appearance", zh: "外观" },
  "settings.model": { en: "Model", zh: "模型" },
  "settings.language": { en: "Language", zh: "语言" },
  "settings.language.hint": {
    en: "Change the language used in the interface.",
    zh: "更改用户界面使用的语言。",
  },
  "settings.logout": { en: "Log out", zh: "退出登录" },
  "settings.emailAccount": { en: "Email account", zh: "邮箱账户" },

  // Language names are autonyms — shown the same in every locale.
  "language.english": { en: "English", zh: "English" },
  "language.chinese": { en: "中文", zh: "中文" },

  // Appearance cards
  "appearance.light": { en: "Light", zh: "浅色" },
  "appearance.dark": { en: "Dark", zh: "深色" },
  "appearance.system": { en: "System", zh: "跟随系统" },

  // Credits section
  "credits.balance": { en: "Balance", zh: "余额" },
  "credits.unit": { en: "credits", zh: "积分" },
  "credits.rule": {
    en: "1 credit covers ~1,000 LLM tokens of generation. Every new account starts with 1,000 free credits.",
    zh: "1 积分约覆盖 1,000 个 LLM token 的生成量。每个新账户注册即获得 1,000 免费积分。",
  },
  "credits.recentActivity": { en: "Recent activity", zh: "近期活动" },
  "credits.outOfCredits": {
    en: "You're out of credits — app generation is paused.",
    zh: "积分已用完 — 应用生成已暂停。",
  },
  "credits.generation": { en: "App generation", zh: "应用生成" },
  "credits.signupGrant": { en: "Welcome grant", zh: "注册赠送" },
  "credits.tokens": { en: "{count} tokens", zh: "{count} tokens" },
  "credits.loadFailed": {
    en: "Failed to load credits",
    zh: "积分信息加载失败",
  },

  // Model section (model/provider values themselves stay untranslated)
  "model.generationModel": { en: "Generation model", zh: "生成模型" },
  "model.provider": { en: "Provider", zh: "提供商" },
  "model.reasoning": { en: "Reasoning", zh: "推理" },
  "model.reasoningValue": {
    en: "disabled for low latency",
    zh: "已禁用以保证低延迟",
  },
  "model.description": {
    en: "This model powers app generation — it plans, writes and revises the code behind every app you build from prompts.",
    zh: "该模型驱动应用生成 — 它为你从提示词构建的每个应用规划、编写并修订代码。",
  },

  // Generic
  "common.loading": { en: "Loading…", zh: "加载中…" },
  "common.close": { en: "Close", zh: "关闭" },
};
