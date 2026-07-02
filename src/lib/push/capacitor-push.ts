'use client';

/**
 * src/lib/push/capacitor-push.ts
 * Sets up native push notifications via Capacitor + FCM.
 * Only runs on native platforms (iOS/Android).
 *
 * Call initNativePush() once on app mount inside a useEffect.
 *
 * ── PLACEHOLDER SETUP ──────────────────────────────────────────────────────
 * Before going live:
 * 1. Add @capacitor/push-notifications:  npm install @capacitor/push-notifications
 * 2. Add to capacitor.config.ts plugins section
 * 3. iOS: add GoogleService-Info.plist to ios/App/App/ in Xcode
 * 4. Android: add google-services.json to android/app/
 * 5. Update AppDelegate.swift (see native-snippets/AppDelegate.swift)
 * 6. Add notification channel (see native-snippets/MainActivity.kt)
 * ─────────────────────────────────────────────────────────────────────────
 */

import { isCapacitorNative } from './platform';

// Session flag — never show denied toast more than once per session (rule #6)
const DENIED_TOAST_KEY = 'mc_push_denied_shown';

export async function initNativePush(onDenied?: () => void) {
  // Guard — only run on native (rule #11)
  if (!isCapacitorNative()) return;

  try {
    // Dynamic import — only available in native build
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Request permission
    const { receive } = await PushNotifications.requestPermissions();

    if (receive === 'denied') {
      // Show one-time toast per session (rule #6)
      if (!sessionStorage.getItem(DENIED_TOAST_KEY)) {
        sessionStorage.setItem(DENIED_TOAST_KEY, '1');
        onDenied?.();
      }
      return;
    }

    // Register for push
    await PushNotifications.register();

    // ── Token received ──────────────────────────────────────────────────
    await PushNotifications.addListener('registration', async ({ value: token }) => {
      // token is a String here (guaranteed by correct AppDelegate — rule #1)
      const platform = getPlatform();
      if (!platform) return;

      await fetch('/api/push/register-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, platform }),
      });
    });

    // ── Registration error ──────────────────────────────────────────────
    await PushNotifications.addListener('registrationError', err => {
      console.error('[native-push] registration error:', err);
    });

    // ── Foreground notification received ────────────────────────────────
    await PushNotifications.addListener('pushNotificationReceived', notification => {
      console.log('[native-push] foreground notification:', notification);
      // Optionally show in-app notification banner here
    });

    // ── Notification tapped (background/killed) ─────────────────────────
    await PushNotifications.addListener('pushNotificationActionPerformed', action => {
      const url = action.notification.data?.url;
      if (url && typeof window !== 'undefined') {
        window.location.href = url;
      }
    });
  } catch (err) {
    console.error('[native-push] init error:', err);
  }
}

function getPlatform(): 'ios' | 'android' | null {
  try {
    // @ts-ignore
    const p = window.Capacitor?.getPlatform?.();
    if (p === 'ios' || p === 'android') return p;
  } catch {}
  return null;
}
