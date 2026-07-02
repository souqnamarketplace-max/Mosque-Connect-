/**
 * src/lib/push/platform.ts
 * Detects platform and gates push registration accordingly.
 * Used by both web push and native FCM paths.
 */

// ── Platform detection ────────────────────────────────────────────────────────
export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  // @ts-ignore
  return !!(window.Capacitor?.isNativePlatform?.());
}

export function supportsWebPush(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  // @ts-ignore
  return window.Capacitor?.getPlatform?.() === 'ios';
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  // @ts-ignore
  return window.Capacitor?.getPlatform?.() === 'android';
}

// ── Permission helpers ────────────────────────────────────────────────────────
export async function getWebPushPermission(): Promise<NotificationPermission> {
  if (!supportsWebPush()) return 'denied';
  return Notification.permission;
}

export async function requestWebPushPermission(): Promise<NotificationPermission> {
  if (!supportsWebPush()) return 'denied';
  return Notification.requestPermission();
}

// ── urlBase64ToUint8Array helper for VAPID ───────────────────────────────────
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
