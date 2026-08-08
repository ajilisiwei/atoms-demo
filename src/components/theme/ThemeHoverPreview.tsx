"use client";

// Hover preview card for the theme picker: the Studio's sample-app canvas
// rendered at full width and scaled down, cropped to its most recognizable
// upper region. Pure CSS-variable rendering — no requests, no screenshots.

import type { ThemeTokens } from "@/lib/theme-tokens";
import { PreviewCanvas } from "./PreviewCanvas";

const CARD_W = 336;
const CANVAS_W = 960;
const SCALE = (CARD_W - 16) / CANVAS_W; // canvas fills the card minus padding
const CROP_H = 224;
const CARD_H = CROP_H + 52;

export interface HoverAnchor {
  // The hovered row's rect edges in viewport coordinates.
  left: number;
  right: number;
  top: number;
}

interface ThemeHoverPreviewProps {
  tokens: ThemeTokens;
  name: string;
  dots: readonly string[];
  anchor: HoverAnchor;
}

export function ThemeHoverPreview({ tokens, name, dots, anchor }: ThemeHoverPreviewProps) {
  const flip = anchor.right + 12 + CARD_W > window.innerWidth - 8;
  const left = flip ? Math.max(8, anchor.left - CARD_W - 12) : anchor.right + 12;
  const top = Math.max(8, Math.min(anchor.top - 8, window.innerHeight - CARD_H - 16));

  return (
    <div
      style={{ left, top, width: CARD_W }}
      className="pointer-events-none fixed z-[70] rounded-2xl border border-line bg-panel p-2 shadow-xl"
    >
      <div
        style={{ height: CROP_H }}
        className="overflow-hidden rounded-xl border border-line"
      >
        <div
          style={{
            width: CANVAS_W,
            transform: `scale(${SCALE})`,
            transformOrigin: "top left",
          }}
        >
          <PreviewCanvas tokens={tokens} />
        </div>
      </div>
      <div className="flex items-center justify-between px-2 pb-1 pt-2.5">
        <span className="min-w-0 truncate text-sm text-muted">{name}</span>
        <span className="flex shrink-0 items-center gap-1">
          {dots.map((color, i) => (
            <span
              key={i}
              className="h-3 w-3 rounded-full border border-line"
              style={{ backgroundColor: color }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
