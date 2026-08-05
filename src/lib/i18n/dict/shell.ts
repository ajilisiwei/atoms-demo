// Shell strings (sidebar, user menu, top bar) plus the apps list / projects
// grid owned by the shell task. Reuses settings.* / appearance.* from common.
export const shellDict: Record<string, { en: string; zh: string }> = {
  // Sidebar navigation
  "shell.home": { en: "Home", zh: "首页" },
  "shell.myApps": { en: "My apps", zh: "我的项目" },
  "shell.recent": { en: "Recent", zh: "最近" },
  "shell.collapseSidebar": { en: "Collapse sidebar", zh: "收起侧边栏" },
  "shell.expandSidebar": { en: "Expand sidebar", zh: "展开侧边栏" },
  "shell.openSettings": { en: "Open settings", zh: "打开设置" },

  // User menu ("Auto" segment; Light/Dark reuse appearance.*)
  "shell.appearance.auto": { en: "Auto", zh: "自动" },

  // Apps page
  "shell.newApp": { en: "+ New app", zh: "+ 新建应用" },
  "shell.appsSubtitle": {
    en: "Everything you have built, newest first.",
    zh: "你构建的所有应用，按最新排序。",
  },
  "shell.deleteConfirm": {
    en: 'Delete "{name}"? This cannot be undone.',
    zh: "删除“{name}”？此操作无法撤销。",
  },
  "shell.deleteFailed": {
    en: "Failed to delete project",
    zh: "删除项目失败",
  },
  "shell.emptyApps": {
    en: "No apps yet — head to Home and describe your first one.",
    zh: "还没有应用 — 前往首页描述你的第一个应用。",
  },

  // Projects grid
  "shell.live": { en: "Live", zh: "已发布" },
  "shell.draft": { en: "Draft", zh: "草稿" },
  "shell.deleteProject": { en: "Delete project", zh: "删除项目" },
  "shell.versionOne": { en: "{count} version", zh: "{count} 个版本" },
  "shell.versionMany": { en: "{count} versions", zh: "{count} 个版本" },
  "shell.emptyDefault": {
    en: "No apps yet — describe one to get started.",
    zh: "还没有应用 — 描述一个即可开始。",
  },

  // Relative time
  "shell.time.justNow": { en: "just now", zh: "刚刚" },
  "shell.time.minutesAgo": { en: "{n}m ago", zh: "{n} 分钟前" },
  "shell.time.hoursAgo": { en: "{n}h ago", zh: "{n} 小时前" },
  "shell.time.daysAgo": { en: "{n}d ago", zh: "{n} 天前" },
};
