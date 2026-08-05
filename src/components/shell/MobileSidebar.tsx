"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { AppSidebar } from "./AppSidebar";

type AppSidebarProps = Parameters<typeof AppSidebar>[0];

interface MobileSidebarProps extends AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

// Slide-over drawer hosting the full AppSidebar on small screens.
// Closes on overlay click, Escape, and route changes.
export function MobileSidebar({ open, onClose, ...sidebarProps }: MobileSidebarProps) {
  const pathname = usePathname();
  const lastPathname = useRef(pathname);

  useEffect(() => {
    if (pathname === lastPathname.current) return;
    lastPathname.current = pathname;
    // Deferred so the close doesn't run as a synchronous set-state-in-effect.
    const timer = setTimeout(onClose, 0);
    return () => clearTimeout(timer);
  }, [pathname, onClose]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 bg-background shadow-2xl">
        <AppSidebar {...sidebarProps} />
      </div>
    </div>
  );
}
