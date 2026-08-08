// Builder strings (header, chat, preview, versions, publish flow).
export const builderDict: Record<string, { en: string; zh: string }> = {
  // Builder header
  "builder.header.backToDashboard": { en: "Back to dashboard", zh: "返回首页" },
  "builder.header.expandChat": { en: "Expand chat", zh: "展开聊天" },
  "builder.header.collapseChat": { en: "Collapse chat", zh: "收起聊天" },
  "builder.header.live": { en: "Live ↗", zh: "已上线 ↗" },
  "builder.header.publish": { en: "Publish", zh: "发布" },
  "builder.header.download": { en: "Download project", zh: "下载项目" },

  // Builder-level errors & system chat messages
  "builder.error.generationFailed": {
    en: "Generation failed — please retry",
    zh: "生成失败 — 请重试",
  },
  "builder.error.loadVersionFailed": {
    en: "Failed to load version",
    zh: "版本加载失败",
  },
  "builder.error.restoreVersionFailed": {
    en: "Failed to restore version",
    zh: "版本恢复失败",
  },
  "builder.chat.restored": {
    en: "Restored {summary} as v{number}.",
    zh: "已将 {summary} 恢复为 v{number}。",
  },

  // Chat panel
  "builder.chat.empty": {
    en: "Describe the app you want and the agent will plan it, write the code and render it live on the right.",
    zh: "描述你想要的应用，智能体会为它规划、编写代码，并在右侧实时呈现。",
  },
  "builder.chat.buildPlan": {
    en: "Build plan ({count} steps)",
    zh: "构建计划（{count} 个步骤）",
  },
  "builder.chat.phase.planning": { en: "Planning the app…", zh: "正在规划应用…" },
  "builder.chat.phase.coding": {
    en: "Writing code… {kb} KB",
    zh: "正在编写代码… {kb} KB",
  },
  "builder.chat.phase.finishing": { en: "Finishing up…", zh: "正在收尾…" },
  "builder.chat.outOfCredits": {
    en: "You've used all your credits, so generation is paused. 1 credit covers ~1K tokens — see Settings → Credits for details.",
    zh: "积分已用完，应用生成已暂停。1 积分约覆盖 1K token — 详见 设置 → 积分。",
  },
  "builder.chat.placeholder.outOfCredits": {
    en: "Out of credits — generation is paused",
    zh: "积分已用完 — 生成已暂停",
  },
  "builder.chat.placeholder.first": {
    en: "@ summons an agent — describe your app… (Enter to send)",
    zh: "@ 一下召唤智能体，描述你的应用…（Enter 发送）",
  },
  "builder.chat.placeholder.change": {
    en: "Describe a change… (Enter to send)",
    zh: "描述改动…（Enter 发送）",
  },
  "builder.chat.send": { en: "Send", zh: "发送" },

  // Preview panel tabs & toolbar
  "builder.tabs.preview": { en: "Preview", zh: "预览" },
  "builder.tabs.code": { en: "Code", zh: "代码" },
  "builder.tabs.versions": { en: "Versions", zh: "版本" },
  "builder.copy": { en: "Copy", zh: "复制" },
  "builder.copied": { en: "Copied ✓", zh: "已复制 ✓" },
  "builder.device.desktop": { en: "Desktop width", zh: "桌面宽度" },
  "builder.device.tablet": { en: "Tablet width", zh: "平板宽度" },
  "builder.device.phone": { en: "Phone width", zh: "手机宽度" },
  "builder.preview.refresh": { en: "Refresh preview", zh: "刷新预览" },
  "builder.preview.openNewTab": { en: "Open in new tab", zh: "在新标签页打开" },
  "builder.preview.iframeTitle": { en: "App preview", zh: "应用预览" },
  "builder.timeline.label": { en: "Evolution", zh: "进化史" },
  "builder.timeline.play": { en: "Replay the app's evolution", zh: "回放应用进化过程" },
  "builder.timeline.pause": { en: "Pause replay", zh: "暂停回放" },
  "builder.timeline.slider": { en: "Version timeline", zh: "版本时间线" },
  "builder.timeline.initial": { en: "First build", zh: "初始版本" },
  "builder.preview.emptyStreaming": {
    en: "The agent is writing code — preview appears when it finishes.",
    zh: "智能体正在编写代码 — 完成后即可预览。",
  },
  "builder.preview.emptyIdle": {
    en: "Nothing here yet. Send a prompt to generate your app.",
    zh: "这里还什么都没有。发送提示词来生成你的应用。",
  },
  "builder.code.empty": {
    en: "// No code yet — send a prompt to generate your app.",
    zh: "// 还没有代码 — 发送提示词生成你的应用。",
  },

  // In-browser build (react-ts projects)
  "builder.compile.compiling": {
    en: "Building preview…",
    zh: "正在打包预览…",
  },
  "builder.compile.failedTitle": {
    en: "Build failed",
    zh: "构建失败",
  },
  "builder.compile.fix": { en: "Fix with AI", zh: "让 AI 修复" },
  "builder.compile.viewCode": { en: "View code", zh: "查看代码" },
  "builder.compile.notBuilt": {
    en: "This version has no build artifact yet.",
    zh: "该版本还没有构建产物。",
  },
  "builder.compile.storeFailed": {
    en: "Failed to store the build artifact — please retry",
    zh: "构建产物保存失败，请重试",
  },

  // Cloud editor
  "builder.files.search": { en: "Search files…", zh: "搜索文件…" },
  "builder.files.collapsePanel": { en: "Collapse file panel", zh: "收起文件栏" },
  "builder.files.expandPanel": { en: "Expand file panel", zh: "展开文件栏" },
  "builder.tabs.closeFile": { en: "Close file", zh: "关闭文件" },
  "builder.editor.editable": { en: "Editable — changes save automatically", zh: "可编辑 — 更改自动保存" },
  "builder.editor.readOnly": { en: "Read-only", zh: "只读" },
  "builder.editor.saving": { en: "Saving…", zh: "保存中…" },
  "builder.editor.saved": { en: "Saved", zh: "已保存" },
  "builder.editor.saveFailed": { en: "Save failed — keep editing to retry", zh: "保存失败 — 继续编辑可重试" },

  // Code view (file tree + read-only source)
  "builder.files.treeLabel": { en: "Project files", zh: "项目文件" },
  "builder.files.empty": {
    en: "No files yet — send a prompt to generate your app.",
    zh: "还没有文件 — 发送提示词生成你的应用。",
  },
  "builder.files.expand": { en: "Expand folder", zh: "展开文件夹" },
  "builder.files.collapse": { en: "Collapse folder", zh: "收起文件夹" },
  "builder.files.writing": { en: "Writing this file…", zh: "正在写入此文件…" },
  "builder.files.modified": { en: "Modified", zh: "已修改" },
  "builder.files.lines": { en: "{n} lines", zh: "{n} 行" },
  "builder.files.copyCode": { en: "Copy code", zh: "复制代码" },
  "builder.files.copied": { en: "Copied", zh: "已复制" },
  "builder.files.codeEmpty": {
    en: "Select a file to view its code.",
    zh: "选择一个文件查看代码。",
  },

  // Versions tab
  "builder.versions.viewingBanner": {
    en: "Viewing v{n} — not the latest version",
    zh: "正在查看 v{n} — 非最新版本",
  },
  "builder.versions.restore": { en: "Restore", zh: "恢复" },
  "builder.versions.backToLatest": { en: "Back to latest", zh: "回到最新" },
  "builder.versions.empty": {
    en: "Versions appear here after your first generation.",
    zh: "首次生成后，版本会显示在这里。",
  },
  "builder.versions.latest": { en: "latest", zh: "最新" },
  "builder.versions.published": { en: "published", zh: "已发布" },

  // Publish dialog
  "builder.publish.title": { en: "Publish app", zh: "发布应用" },
  "builder.publish.liveAt": { en: "Your app is live at:", zh: "你的应用已上线：" },
  "builder.publish.explainer": {
    en: "Publishing makes this app available to anyone at a public URL. You can unpublish or update it at any time.",
    zh: "发布后，任何人都可以通过公开链接访问此应用。你可以随时取消发布或更新。",
  },
  "builder.publish.failed": { en: "Publish failed", zh: "发布失败" },
  "builder.publish.unpublishFailed": {
    en: "Unpublish failed",
    zh: "取消发布失败",
  },
  "builder.publish.working": { en: "Working…", zh: "处理中…" },
  "builder.publish.update": {
    en: "Update live app to v{n}",
    zh: "将线上应用更新为 v{n}",
  },
  "builder.publish.publishVersion": { en: "Publish v{n}", zh: "发布 v{n}" },
  "builder.publish.versionLive": { en: "v{n} is live ✓", zh: "v{n} 已上线 ✓" },
  "builder.publish.unpublish": { en: "Unpublish", zh: "取消发布" },
};
