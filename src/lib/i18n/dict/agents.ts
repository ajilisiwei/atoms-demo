// Built-in buddy strings (names stay untranslated).
// The per-buddy tagline keys below are superseded by the DB-backed taglines in
// agent-seed-data.ts and are kept only until the last UI reference is gone.
export const agentsDict: Record<string, { en: string; zh: string }> = {
  "agents.rowLabel": {
    en: "Pick an expert buddy to build with",
    zh: "选择一位专家搭档一起构建",
  },
  "agents.buildWith": { en: "Build with {name}", zh: "与 {name} 一起构建" },
  "agents.clear": { en: "Clear buddy", zh: "取消选择" },
  "agents.group.work": { en: "Work", zh: "工作" },
  "agents.group.life": { en: "Life", zh: "生活" },
  "agents.group.custom": { en: "My buddies", zh: "我的搭档" },
  "agents.starterLabel": { en: "Try one of these", zh: "试试这些" },
  "agents.moreBuddies": { en: "All buddies", zh: "全部搭档" },
  "agents.createBuddy": { en: "Create a buddy", zh: "创建搭档" },
  "agents.editBuddy": { en: "Edit buddy", zh: "编辑搭档" },
  "agents.timo.tagline": {
    en: "Productivity coach — todos, timers, habit trackers",
    zh: "效率管家 —— 待办、番茄钟、习惯打卡",
  },
  "agents.ledger.tagline": {
    en: "Finance buddy — expenses, budgets, subscriptions",
    zh: "记账小能手 —— 记账、预算、订阅管理",
  },
  "agents.momo.tagline": {
    en: "Kitchen helper — recipes, meal plans, grocery lists",
    zh: "厨房帮手 —— 食谱、膳食计划、购物清单",
  },
  "agents.pixel.tagline": {
    en: "Game maker — snake, memory, puzzles & fun",
    zh: "游戏制造机 —— 贪吃蛇、记忆、益智小游戏",
  },
  "agents.sage.tagline": {
    en: "Study mentor — flashcards, quizzes, learning tools",
    zh: "学习导师 —— 单词卡、测验、学习工具",
  },

  // ==== BEGIN agents.editor.* — custom buddy editor dialog ====
  "agents.editor.createTitle": { en: "New buddy", zh: "新建搭档" },
  "agents.editor.editTitle": { en: "Edit buddy", zh: "编辑搭档" },
  "agents.editor.nameLabel": { en: "Name", zh: "名字" },
  "agents.editor.namePlaceholder": { en: "e.g. Nova", zh: "例如 Nova" },
  "agents.editor.specialtyLabel": { en: "Specialty", zh: "擅长领域" },
  "agents.editor.specialtyPlaceholder": {
    en: "Describe what this buddy is good at — the kinds of apps it should build and the style it should favor.",
    zh: "描述这位搭档擅长什么 —— 它应该构建哪类应用、偏好什么风格。",
  },
  "agents.editor.specialtyHint": {
    en: "Written into the buddy's persona. At least {min} characters.",
    zh: "会写入搭档的人设，至少 {min} 个字符。",
  },
  "agents.editor.counter": { en: "{n}/{max}", zh: "{n}/{max}" },
  "agents.editor.avatarLabel": { en: "Avatar", zh: "头像" },
  "agents.editor.upload": { en: "Upload", zh: "上传" },
  "agents.editor.uploading": { en: "Uploading…", zh: "上传中…" },
  "agents.editor.uploadHint": {
    en: "PNG, JPEG or WebP — cropped to a square, max 1 MB.",
    zh: "支持 PNG、JPEG、WebP —— 自动裁剪为正方形，最大 1 MB。",
  },
  "agents.editor.uploadFailed": { en: "Avatar upload failed", zh: "头像上传失败" },
  "agents.editor.create": { en: "Create buddy", zh: "创建搭档" },
  "agents.editor.save": { en: "Save changes", zh: "保存修改" },
  "agents.editor.saving": { en: "Saving…", zh: "保存中…" },
  "agents.editor.failed": { en: "Could not save this buddy", zh: "保存失败" },
  // ==== END agents.editor.* ====
};
