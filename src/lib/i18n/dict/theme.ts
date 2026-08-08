// Theme Studio strings: the sample app rendered on the preview canvas, and the
// accessibility linter's findings. The canvas copy belongs to a fictional
// logistics dashboard ("Harbor") — concrete content makes a theme far easier to
// judge than placeholder text, and its statuses map honestly onto the
// success / warning / destructive slots.
export const themeDict: Record<string, { en: string; zh: string }> = {
  // Preview canvas — shell
  "theme.preview.ariaLabel": {
    en: "Theme preview — sample application",
    zh: "主题预览 — 示例应用",
  },
  "theme.preview.brand": { en: "Harbor", zh: "Harbor" },
  "theme.preview.nav.overview": { en: "Overview", zh: "总览" },
  "theme.preview.nav.orders": { en: "Orders", zh: "订单" },
  "theme.preview.nav.reports": { en: "Reports", zh: "报表" },
  "theme.preview.nav.action": { en: "New order", zh: "新建订单" },
  "theme.preview.title": { en: "Operations overview", zh: "运营总览" },
  "theme.preview.subtitle": {
    en: "Week of 12 August · Rotterdam hub",
    zh: "8 月 12 日当周 · 鹿特丹中心仓",
  },

  // Preview canvas — stats
  "theme.preview.stat.orders.value": { en: "2,481", zh: "2,481" },
  "theme.preview.stat.orders.label": { en: "Orders this week", zh: "本周订单" },
  "theme.preview.stat.onTime.value": { en: "94.2%", zh: "94.2%" },
  "theme.preview.stat.onTime.label": {
    en: "On-time delivery",
    zh: "准时送达率",
  },
  "theme.preview.stat.handling.value": { en: "18m", zh: "18 分钟" },
  "theme.preview.stat.handling.label": {
    en: "Average handling time",
    zh: "平均处理时长",
  },

  // Preview canvas — form card
  "theme.preview.form.title": { en: "Create shipment", zh: "新建运单" },
  "theme.preview.form.reference": { en: "Reference", zh: "运单号" },
  "theme.preview.form.referenceValue": { en: "SO-4417", zh: "SO-4417" },
  "theme.preview.form.destination": { en: "Destination", zh: "目的地" },
  "theme.preview.form.destinationValue": { en: "Rotterdam", zh: "鹿特丹" },
  "theme.preview.form.service": { en: "Service level", zh: "服务等级" },
  "theme.preview.form.serviceValue": { en: "Express", zh: "特快" },
  "theme.preview.form.submit": { en: "Create shipment", zh: "创建运单" },
  "theme.preview.form.cancel": { en: "Cancel", zh: "取消" },

  // Preview canvas — activity list
  "theme.preview.list.title": { en: "Recent activity", zh: "最近动态" },
  "theme.preview.list.meta": { en: "Last 24 hours", zh: "最近 24 小时" },
  "theme.preview.list.delivered.initials": { en: "IC", zh: "IC" },
  "theme.preview.list.delivered.name": { en: "Ivy Chen", zh: "Ivy Chen" },
  // Details carry a fact the badge does not already state, and stay short
  // enough to survive a narrow card without truncating.
  "theme.preview.list.delivered.detail": {
    en: "#4412 · signed for at 14:20",
    zh: "#4412 · 14:20 已签收",
  },
  "theme.preview.list.delivered.badge": { en: "Delivered", zh: "已送达" },
  "theme.preview.list.pending.initials": { en: "MR", zh: "MR" },
  "theme.preview.list.pending.name": { en: "Marco Reyes", zh: "Marco Reyes" },
  "theme.preview.list.pending.detail": {
    en: "#4408 · awaiting pickup",
    zh: "#4408 · 等待取件",
  },
  "theme.preview.list.pending.badge": { en: "Pending", zh: "待处理" },
  "theme.preview.list.failed.initials": { en: "DO", zh: "DO" },
  "theme.preview.list.failed.name": { en: "Dana Okafor", zh: "Dana Okafor" },
  "theme.preview.list.failed.detail": {
    en: "#4399 · address rejected",
    zh: "#4399 · 地址被拒绝",
  },
  "theme.preview.list.failed.badge": { en: "Failed", zh: "失败" },

  // Preview canvas — empty state & footer
  "theme.preview.empty.title": {
    en: "No shipments in this range",
    zh: "该时间段内没有运单",
  },
  "theme.preview.empty.body": {
    en: "Widen the date filter, or create a shipment to get started.",
    zh: "放宽日期筛选，或创建一张运单开始使用。",
  },
  "theme.preview.footer.meta": { en: "Harbor · v2.4", zh: "Harbor · v2.4" },
  "theme.preview.footer.status": {
    en: "All systems normal",
    zh: "系统运行正常",
  },

  // Accessibility linter
  "theme.lint.title": { en: "Contrast check", zh: "对比度检查" },
  "theme.lint.allClear": {
    en: "No contrast problems — this theme is safe to ship.",
    zh: "未发现对比度问题 — 该主题可以放心使用。",
  },
  "theme.lint.contrastRatio": { en: "Contrast ratio", zh: "对比度" },
  "theme.lint.level.error": { en: "Error", zh: "错误" },
  "theme.lint.level.warn": { en: "Warning", zh: "警告" },
  "theme.lint.level.info": { en: "Info", zh: "提示" },
  "theme.lint.bodyContrast": {
    en: "Body text falls below 4.5:1 on the background — darken the text or lighten the page.",
    zh: "正文与背景的对比度低于 4.5:1 — 请加深文字或提亮页面。",
  },
  "theme.lint.mutedContrast": {
    en: "Secondary text falls below 3:1 on the background — it will disappear in bright light.",
    zh: "次要文字与背景的对比度低于 3:1 — 强光下几乎不可见。",
  },
  "theme.lint.primaryContrast": {
    en: "Label text on the primary colour falls below 4.5:1 — buttons will be hard to read.",
    zh: "主色上的文字对比度低于 4.5:1 — 按钮文字将难以辨认。",
  },
  "theme.lint.surfaceSeparation": {
    en: "Cards barely separate from the page — move the surface lightness further from the background.",
    zh: "卡片与页面几乎无法区分 — 请拉开卡片与背景的明度差。",
  },
  "theme.lint.ringContrast": {
    en: "The focus ring falls below 3:1 on the background — keyboard users will lose their place.",
    zh: "焦点环与背景的对比度低于 3:1 — 键盘用户将无法定位。",
  },
  "theme.lint.destructiveHue": {
    en: "The destructive colour is not red — people read red as danger, so warnings may be missed.",
    zh: "警示色不是红色 — 用户以红色识别危险，警告可能被忽略。",
  },

  // Token form
  "theme.group.color": { en: "Colors", zh: "配色" },
  "theme.group.typography": { en: "Typography", zh: "字体" },
  "theme.group.shape": { en: "Shape & layout", zh: "形状与布局" },
  "theme.group.icon": { en: "Icons", zh: "图标" },
  "theme.group.effects": { en: "Effects", zh: "效果" },
  "theme.brandPlaceholder": { en: "#4b6bfb", zh: "#4b6bfb" },
  "theme.deriveFromBrand": { en: "Derive", zh: "一键派生" },
  "theme.color.background": { en: "Background", zh: "页面背景" },
  "theme.color.surface": { en: "Surface", zh: "卡片表面" },
  "theme.color.surfaceRaised": { en: "Raised surface", zh: "浮层表面" },
  "theme.color.foreground": { en: "Text", zh: "正文文字" },
  "theme.color.muted": { en: "Muted text", zh: "次要文字" },
  "theme.color.primary": { en: "Primary", zh: "主色" },
  "theme.color.primaryForeground": { en: "On primary", zh: "主色上文字" },
  "theme.color.accent": { en: "Accent", zh: "点缀色" },
  "theme.color.success": { en: "Success", zh: "成功" },
  "theme.color.warning": { en: "Warning", zh: "警告" },
  "theme.color.destructive": { en: "Destructive", zh: "危险" },
  "theme.color.border": { en: "Border", zh: "边框" },
  "theme.color.ring": { en: "Focus ring", zh: "焦点环" },
  "theme.typo.display": { en: "Heading font", zh: "标题字体" },
  "theme.typo.body": { en: "Body font", zh: "正文字体" },
  "theme.typo.baseSize": { en: "Base size", zh: "基准字号" },
  "theme.typo.scale": { en: "Scale ratio", zh: "阶梯比例" },
  "theme.typo.headingWeight": { en: "Heading weight", zh: "标题字重" },
  "theme.typo.lineHeight": { en: "Line height", zh: "行高" },
  "theme.typo.tracking": { en: "Heading tracking", zh: "标题字距" },
  "theme.font.sans-modern": { en: "Modern", zh: "现代" },
  "theme.font.sans-grotesk": { en: "Grotesk", zh: "怪诞体" },
  "theme.font.serif-elegant": { en: "Serif", zh: "衬线" },
  "theme.font.rounded-friendly": { en: "Rounded", zh: "圆润" },
  "theme.font.mono-tech": { en: "Mono", zh: "等宽" },
  "theme.tracking.tight": { en: "Tight", zh: "紧" },
  "theme.tracking.normal": { en: "Normal", zh: "标准" },
  "theme.tracking.wide": { en: "Wide", zh: "宽" },
  "theme.shape.radius": { en: "Corner radius", zh: "圆角" },
  "theme.shape.density": { en: "Density", zh: "密度" },
  "theme.shape.border": { en: "Borders", zh: "边框风格" },
  "theme.layout.container": { en: "Layout", zh: "布局" },
  "theme.radius.sharp": { en: "Sharp", zh: "锐利" },
  "theme.radius.soft": { en: "Soft", zh: "柔和" },
  "theme.radius.round": { en: "Round", zh: "圆润" },
  "theme.radius.pill": { en: "Pill", zh: "胶囊" },
  "theme.density.compact": { en: "Compact", zh: "紧凑" },
  "theme.density.normal": { en: "Normal", zh: "标准" },
  "theme.density.relaxed": { en: "Relaxed", zh: "宽松" },
  "theme.border.hairline": { en: "Hairline", zh: "细线" },
  "theme.border.none": { en: "None", zh: "无" },
  "theme.border.bold": { en: "Bold", zh: "粗描" },
  "theme.container.card": { en: "Cards", zh: "卡片" },
  "theme.container.split": { en: "Split", zh: "分栏" },
  "theme.container.fluid": { en: "Fluid", zh: "全宽" },
  "theme.icon.style": { en: "Style", zh: "风格" },
  "theme.icon.strokeWidth": { en: "Stroke", zh: "描边" },
  "theme.icon.corner": { en: "Corners", zh: "转角" },
  "theme.iconStyle.line": { en: "Line", zh: "线性" },
  "theme.iconStyle.filled": { en: "Filled", zh: "填充" },
  "theme.iconStyle.duotone": { en: "Duotone", zh: "双色" },
  "theme.corner.sharp": { en: "Sharp", zh: "锐利" },
  "theme.corner.rounded": { en: "Rounded", zh: "圆头" },
  "theme.effects.shadow": { en: "Shadows", zh: "阴影" },
  "theme.effects.motion": { en: "Motion", zh: "动效" },
  "theme.shadow.none": { en: "None", zh: "无" },
  "theme.shadow.soft": { en: "Soft", zh: "柔和" },
  "theme.shadow.pronounced": { en: "Bold", zh: "显著" },
  "theme.motion.none": { en: "None", zh: "无" },
  "theme.motion.subtle": { en: "Subtle", zh: "克制" },
  "theme.motion.playful": { en: "Playful", zh: "活泼" },

  // Theme Studio chrome
  "theme.studio.title": { en: "Theme Studio", zh: "主题工作室" },
  "theme.studio.builtinGroup": { en: "Built-in themes", zh: "内置主题" },
  "theme.studio.customGroup": { en: "My themes", zh: "我的主题" },
  "theme.studio.unsaved": { en: "Unsaved changes", zh: "未保存的修改" },
  "theme.studio.delete": { en: "Delete", zh: "删除" },
  "theme.studio.save": { en: "Save", zh: "保存" },
  "theme.studio.saveAs": { en: "Save as new", zh: "另存为新主题" },
  "theme.studio.apply": { en: "Use this theme", zh: "使用此主题" },
  "theme.studio.applyNeedsSave": {
    en: "Save your changes as a new theme first",
    zh: "请先将修改另存为新主题",
  },
  "theme.studio.loadFailed": { en: "Failed to load themes", zh: "主题加载失败" },
  "theme.studio.saveFailed": { en: "Failed to save theme", zh: "主题保存失败" },
  "theme.studio.deleteFailed": { en: "Failed to delete theme", zh: "主题删除失败" },
  "theme.studio.lintTitle": { en: "UX checks", zh: "UX 规范检查" },
  "theme.studio.canvasNote": {
    en: "The canvas previews your tokens on a sample app. Generated apps follow the same tokens, composed by AI.",
    zh: "画布用示例应用预览你的 token 效果。生成的应用会由 AI 按同一套 token 创作。",
  },
  "theme.studio.saveAsTitle": { en: "Save as new theme", zh: "另存为新主题" },
  "theme.studio.customSuffix": { en: "Custom", zh: "自定义" },
  "theme.studio.deleteTitle": { en: "Delete {name}?", zh: "删除 {name}？" },
  "theme.studio.deleteBody": {
    en: "Projects using it will fall back to no theme. This cannot be undone.",
    zh: "使用它的项目将回落为无主题，此操作无法撤销。",
  },
};
