"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Top-of-page progress bar shown whenever the user clicks a Link that's still
 * loading data on the server. Provides instant feedback so the app never feels
 * "frozen" between click and full render.
 *
 * Strategy:
 * - Listen to clicks on any in-app <a> tag (Next.js Link renders a real anchor).
 * - Start the bar; reset it when pathname or search params change.
 * - Auto-finish after 6s in case Next.js cancels the navigation.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // Listen globally for in-app link clicks
  useEffect(() => {
    function onClick(e: MouseEvent) {
      // Only react to plain left-clicks without modifier keys
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (!anchor.href) return;

      const url = new URL(anchor.href);
      // Skip external, same-page, target=_blank, downloads
      if (url.origin !== window.location.origin) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      )
        return;

      setVisible(true);
      setProgress(15);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Animate progress while loading
  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        return p + Math.max(1, (90 - p) * 0.08);
      });
    }, 120);
    return () => window.clearInterval(id);
  }, [visible]);

  // Reset when route changes — finishes the bar
  useEffect(() => {
    if (!visible) return;
    setProgress(100);
    const t = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 250);
    return () => window.clearTimeout(t);
    // Pathname OR query change both indicate the route resolved
  }, [pathname, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Safety timeout so the bar never stays visible forever
  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 6000);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 top-0 z-[100] h-0.5 bg-transparent"
    >
      <div
        className="h-full bg-pilot-500 shadow-[0_0_8px_rgba(91,79,232,0.6)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
