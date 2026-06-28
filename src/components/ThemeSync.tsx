"use client";

import { useEffect } from "react";

/**
 * Resolves "system" theme preference to actual light/dark by reading
 * prefers-color-scheme, since that's only knowable client-side. Also keeps
 * the applied theme in sync if the person changes their OS-level light/dark
 * setting while the app stays open (e.g. their phone auto-switches at
 * sunset) — without this, the app would silently stay on whichever theme
 * happened to be true at page load.
 *
 * For explicit "light"/"dark" (not "system"), the class is already applied
 * server-side in layout.tsx before this even mounts, so this component is a
 * no-op for those two cases — it only does work when serverTheme is "system".
 */
export default function ThemeSync({ serverTheme }: { serverTheme: "light" | "dark" | "system" }) {
  useEffect(() => {
    if (serverTheme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applySystemTheme() {
      document.documentElement.classList.toggle("dark", mediaQuery.matches);
      document.documentElement.classList.toggle("light", !mediaQuery.matches);
    }

    applySystemTheme();
    mediaQuery.addEventListener("change", applySystemTheme);
    return () => mediaQuery.removeEventListener("change", applySystemTheme);
  }, [serverTheme]);

  return null;
}
