"use client";

// Theme Studio's left column: grouped token controls. Constrained inputs
// only — segmented choices and hex fields, never free CSS.

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { deriveColorsFromBrand } from "@/lib/theme-derive";
import type { FontStackKey, ThemeTokens } from "@/lib/theme-tokens";

interface TokenFormProps {
  tokens: ThemeTokens;
  onChange: (tokens: ThemeTokens) => void;
  readOnly?: boolean;
}

const COLOR_SLOTS: (keyof ThemeTokens["color"])[] = [
  "background",
  "surface",
  "surfaceRaised",
  "foreground",
  "muted",
  "primary",
  "primaryForeground",
  "accent",
  "success",
  "warning",
  "destructive",
  "border",
  "ring",
];

const FONT_OPTIONS: FontStackKey[] = [
  "sans-modern",
  "sans-grotesk",
  "serif-elegant",
  "rounded-friendly",
  "mono-tech",
];

function Group({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium hover:bg-panel-2/60 transition-colors"
      >
        {title}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-muted transition-transform ${open ? "" : "-rotate-90"}`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function SegRow<T extends string | number>({
  label,
  options,
  value,
  onPick,
  disabled,
  render = (v) => String(v),
}: {
  label: string;
  options: readonly T[];
  value: T;
  onPick: (v: T) => void;
  disabled?: boolean;
  render?: (v: T) => string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="shrink-0 text-xs text-muted">{label}</span>
      <div className="flex min-w-0 items-center overflow-x-auto rounded-full border border-line bg-panel-2/60 p-0.5">
        {options.map((opt) => (
          <button
            key={String(opt)}
            type="button"
            disabled={disabled}
            onClick={() => onPick(opt)}
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] transition-colors disabled:opacity-50 ${
              opt === value
                ? "bg-panel text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {render(opt)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TokenForm({ tokens, onChange, readOnly }: TokenFormProps) {
  const t = useT();
  const [brand, setBrand] = useState("");

  const patch = <K extends keyof ThemeTokens>(group: K, value: Partial<ThemeTokens[K]>) =>
    onChange({ ...tokens, [group]: { ...tokens[group], ...value } });

  function applyBrand() {
    const derived = deriveColorsFromBrand(brand);
    if (derived) onChange({ ...tokens, color: derived });
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Group title={t("theme.group.color")} defaultOpen>
        <div className="mb-3 flex items-center gap-1.5">
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder={t("theme.brandPlaceholder")}
            disabled={readOnly}
            className="h-7 min-w-0 flex-1 rounded-lg border border-line bg-panel px-2.5 font-mono text-xs outline-none placeholder:text-muted focus:border-accent-2/50 disabled:opacity-50"
          />
          <button
            type="button"
            disabled={readOnly || !/^#?[0-9a-f]{6}$/i.test(brand.trim())}
            onClick={applyBrand}
            className="h-7 shrink-0 rounded-lg bg-foreground px-2.5 text-xs font-medium text-background hover:opacity-85 transition-opacity disabled:opacity-30"
          >
            {t("theme.deriveFromBrand")}
          </button>
        </div>
        <div className="flex flex-col">
          {COLOR_SLOTS.map((slot) => (
            <div key={slot} className="flex items-center gap-2 py-1">
              <input
                type="color"
                value={tokens.color[slot]}
                disabled={readOnly}
                onChange={(e) => patch("color", { [slot]: e.target.value } as never)}
                className="h-6 w-6 shrink-0 cursor-pointer rounded border border-line bg-transparent p-0 disabled:cursor-default"
                aria-label={slot}
              />
              <span className="min-w-0 flex-1 truncate text-xs">{t(`theme.color.${slot}`)}</span>
              <input
                value={tokens.color[slot]}
                disabled={readOnly}
                onChange={(e) => {
                  const v = e.target.value.trim().toLowerCase();
                  patch("color", { [slot]: v } as never);
                }}
                className="h-6 w-[74px] shrink-0 rounded-md border border-line bg-panel px-1.5 font-mono text-[11px] outline-none focus:border-accent-2/50 disabled:opacity-50"
              />
            </div>
          ))}
        </div>
      </Group>

      <Group title={t("theme.group.typography")}>
        <SegRow
          label={t("theme.typo.display")}
          options={FONT_OPTIONS}
          value={tokens.typography.display}
          onPick={(v) => patch("typography", { display: v })}
          disabled={readOnly}
          render={(v) => t(`theme.font.${v}`)}
        />
        <SegRow
          label={t("theme.typo.body")}
          options={FONT_OPTIONS}
          value={tokens.typography.body}
          onPick={(v) => patch("typography", { body: v })}
          disabled={readOnly}
          render={(v) => t(`theme.font.${v}`)}
        />
        <SegRow
          label={t("theme.typo.baseSize")}
          options={[14, 15, 16] as const}
          value={tokens.typography.baseSize}
          onPick={(v) => patch("typography", { baseSize: v })}
          disabled={readOnly}
        />
        <SegRow
          label={t("theme.typo.scale")}
          options={[1.2, 1.25, 1.333] as const}
          value={tokens.typography.scaleRatio}
          onPick={(v) => patch("typography", { scaleRatio: v })}
          disabled={readOnly}
        />
        <SegRow
          label={t("theme.typo.headingWeight")}
          options={[500, 600, 700, 800] as const}
          value={tokens.typography.headingWeight}
          onPick={(v) => patch("typography", { headingWeight: v })}
          disabled={readOnly}
        />
        <SegRow
          label={t("theme.typo.lineHeight")}
          options={[1.5, 1.6, 1.75] as const}
          value={tokens.typography.bodyLineHeight}
          onPick={(v) => patch("typography", { bodyLineHeight: v })}
          disabled={readOnly}
        />
        <SegRow
          label={t("theme.typo.tracking")}
          options={["tight", "normal", "wide"] as const}
          value={tokens.typography.headingTracking}
          onPick={(v) => patch("typography", { headingTracking: v })}
          disabled={readOnly}
          render={(v) => t(`theme.tracking.${v}`)}
        />
      </Group>

      <Group title={t("theme.group.shape")}>
        <SegRow
          label={t("theme.shape.radius")}
          options={["sharp", "soft", "round", "pill"] as const}
          value={tokens.shape.radius}
          onPick={(v) => patch("shape", { radius: v })}
          disabled={readOnly}
          render={(v) => t(`theme.radius.${v}`)}
        />
        <SegRow
          label={t("theme.shape.density")}
          options={["compact", "normal", "relaxed"] as const}
          value={tokens.shape.density}
          onPick={(v) => patch("shape", { density: v })}
          disabled={readOnly}
          render={(v) => t(`theme.density.${v}`)}
        />
        <SegRow
          label={t("theme.shape.border")}
          options={["hairline", "none", "bold"] as const}
          value={tokens.shape.border}
          onPick={(v) => patch("shape", { border: v })}
          disabled={readOnly}
          render={(v) => t(`theme.border.${v}`)}
        />
        <SegRow
          label={t("theme.layout.container")}
          options={["card", "split", "fluid"] as const}
          value={tokens.layout.container}
          onPick={(v) => patch("layout", { container: v })}
          disabled={readOnly}
          render={(v) => t(`theme.container.${v}`)}
        />
      </Group>

      <Group title={t("theme.group.icon")}>
        <SegRow
          label={t("theme.icon.style")}
          options={["line", "filled", "duotone"] as const}
          value={tokens.icon.style}
          onPick={(v) => patch("icon", { style: v })}
          disabled={readOnly}
          render={(v) => t(`theme.iconStyle.${v}`)}
        />
        <SegRow
          label={t("theme.icon.strokeWidth")}
          options={[1.5, 2] as const}
          value={tokens.icon.strokeWidth}
          onPick={(v) => patch("icon", { strokeWidth: v })}
          disabled={readOnly || tokens.icon.style !== "line"}
        />
        <SegRow
          label={t("theme.icon.corner")}
          options={["sharp", "rounded"] as const}
          value={tokens.icon.corner}
          onPick={(v) => patch("icon", { corner: v })}
          disabled={readOnly}
          render={(v) => t(`theme.corner.${v}`)}
        />
      </Group>

      <Group title={t("theme.group.effects")}>
        <SegRow
          label={t("theme.effects.shadow")}
          options={["none", "soft", "pronounced"] as const}
          value={tokens.effects.shadow}
          onPick={(v) => patch("effects", { shadow: v })}
          disabled={readOnly}
          render={(v) => t(`theme.shadow.${v}`)}
        />
        <SegRow
          label={t("theme.effects.motion")}
          options={["none", "subtle", "playful"] as const}
          value={tokens.effects.motion}
          onPick={(v) => patch("effects", { motion: v })}
          disabled={readOnly}
          render={(v) => t(`theme.motion.${v}`)}
        />
      </Group>
    </div>
  );
}
