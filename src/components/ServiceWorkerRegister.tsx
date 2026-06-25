"use client";

import { useEffect } from "react";
import { isCapacitorNative } from "@/lib/push/platform";

/** Registers the service worker in browser/PWA contexts only. Inside a
 * Capacitor native shell, this is skipped entirely — service workers
 * aren't the right tool there, and Capacitor's native push plugin should
 * be used instead (see platform.ts). */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (isCapacitorNative()) return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  }, []);

  return null;
}
