/**
 * Detects whether the app is running inside a Capacitor native shell vs. a
 * regular browser/PWA context. This is the single gate that should decide
 * which push transport to use, per the standard PWA->Capacitor migration
 * pattern: browser-only APIs (Web Push, beforeinstallprompt) must not fire
 * inside the native WebView, and vice versa for native plugin calls.
 *
 * Capacitor injects `window.Capacitor` at runtime when running inside the
 * native shell; it is undefined in a plain browser tab, even one that has
 * the PWA installed to the home screen. We avoid importing @capacitor/core
 * directly here so this file has zero effect (and zero new dependency)
 * until the project is actually wrapped with Capacitor.
 */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return typeof cap?.isNativePlatform === "function" && cap.isNativePlatform();
}

export function supportsWebPush(): boolean {
  if (typeof window === "undefined") return false;
  if (isCapacitorNative()) return false; // native push takes over instead
  return "serviceWorker" in navigator && "PushManager" in window;
}
