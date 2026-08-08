"use client";

import { useRef, useState } from "react";

// Horizontal pane resizing via a drag handle. Width is clamped to
// [min, max]; `sign` is +1 when dragging right grows the pane (pane left of
// the handle) and -1 for the mirrored case.
export function useResizableWidth(initial: number, min: number, max: number, sign = 1) {
  const [width, setWidth] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ x: 0, w: initial });

  const handleProps = {
    onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
      e.preventDefault();
      startRef.current = { x: e.clientX, w: width };
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
      if (!dragging) return;
      const delta = (e.clientX - startRef.current.x) * sign;
      setWidth(Math.min(max, Math.max(min, startRef.current.w + delta)));
    },
    onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
      setDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    },
  };

  return { width, dragging, handleProps };
}

export function ResizeHandle({
  dragging,
  className = "",
  ...handleProps
}: {
  dragging: boolean;
  className?: string;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <>
      <div
        {...handleProps}
        role="separator"
        aria-orientation="vertical"
        className={`relative z-10 w-1 shrink-0 cursor-col-resize touch-none transition-colors hover:bg-accent-2/40 ${
          dragging ? "bg-accent-2/60" : "bg-transparent"
        } ${className}`}
      />
      {/* Full-screen shield while dragging so iframes don't eat the events. */}
      {dragging && <div className="fixed inset-0 z-50 cursor-col-resize" />}
    </>
  );
}
