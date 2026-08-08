"use client";

// Accessibility readout for the theme being edited. This is studio chrome, so
// unlike the preview canvas it is styled with the app's own design tokens.

import { useT } from "@/lib/i18n";
import { lintTheme, type LintFinding } from "@/lib/theme-contrast";
import type { ThemeTokens } from "@/lib/theme-tokens";

// Errors first: they block shipping, warnings only advise. Sort is stable, so
// findings keep their rule order within a level.
const LEVEL_ORDER: Record<LintFinding["level"], number> = {
  error: 0,
  warn: 1,
  info: 2,
};

const LEVEL_DOT: Record<LintFinding["level"], string> = {
  error: "bg-red-500",
  warn: "bg-amber-500",
  info: "bg-muted",
};

export function ThemeLint({ tokens }: { tokens: ThemeTokens }) {
  const t = useT();
  const findings = [...lintTheme(tokens)].sort(
    (a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]
  );

  return (
    <div className="rounded-xl border border-line bg-panel p-3">
      <p className="mb-2 text-xs font-medium text-muted">
        {t("theme.lint.title")}
      </p>

      {findings.length === 0 ? (
        <p className="flex items-start gap-2 text-sm text-foreground">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="mt-1 shrink-0 text-emerald-500"
          >
            <path d="m4 12.5 5 5 11-11" />
          </svg>
          {t("theme.lint.allClear")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {findings.map((finding) => (
            <li key={finding.id} className="flex items-start gap-2 text-sm">
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${LEVEL_DOT[finding.level]}`}
                aria-hidden="true"
              />
              <span className="sr-only">
                {t(`theme.lint.level.${finding.level}`)}
              </span>
              <span className="min-w-0 flex-1 text-foreground">
                {t(finding.messageKey)}
              </span>
              {finding.ratio !== undefined && (
                <span
                  title={t("theme.lint.contrastRatio")}
                  className="shrink-0 rounded-md bg-panel-2 px-1.5 py-0.5 text-xs tabular-nums text-muted"
                >
                  {finding.ratio.toFixed(1)}:1
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
