/**
 * src/lib/push/web-push-sender.ts
 * Server-side: sends Web Push notifications via VAPID.
 *
 * ── PLACEHOLDER SETUP ──────────────────────────────────────────────────────
 * Before going live, add these to Vercel environment variables:
 *
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY   — from: npx web-push generate-vapid-keys
 *   VAPID_PRIVATE_KEY              — from: npx web-push generate-vapid-keys
 *   VAPID_CONTACT_EMAIL            — e.g. mailto:admin@masjidconnect.ca
 *
 * Generate keys by running in your project root:
 *   npx web-push generate-vapid-keys
 * ─────────────────────────────────────────────────────────────────────────
 */

import webpush from 'web-push';

const VAPID_PUBLIC_KEY  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY  ?? 'PLACEHOLDER_VAPID_PUBLIC_KEY';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY             ?? 'PLACEHOLDER_VAPID_PRIVATE_KEY';
const VAPID_EMAIL       = process.env.VAPID_CONTACT_EMAIL           ?? 'mailto:admin@masjidconnect.ca';

// Only configure if real keys are set
if (VAPID_PUBLIC_KEY !== 'PLACEHOLDER_VAPID_PUBLIC_KEY') {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  category?: 'announcement' | 'event' | 'emergency' | 'athan' | 'dua' | 'general';
}

export interface WebPushSubscription {
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

/**
 * Send a web push notification to a single subscription.
 * Returns true on success, false on failure (expired/invalid subscription).
 */
export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: PushPayload
): Promise<boolean> {
  // Skip silently if keys are placeholders
  if (VAPID_PUBLIC_KEY === 'PLACEHOLDER_VAPID_PUBLIC_KEY') {
    console.warn('[web-push] VAPID keys not set — skipping push (placeholder mode)');
    return true;
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth_key,
        },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (err: any) {
    // 410 Gone = subscription expired/unsubscribed — caller should delete it
    if (err.statusCode === 410) return false;
    console.error('[web-push] send error:', err);
    return false;
  }
}

/**
 * Send to all subscriptions for a set of user_ids.
 * Expired subscriptions are returned for cleanup.
 */
export async function sendWebPushToUsers(
  subscriptions: (WebPushSubscription & { id: string; user_id: string })[],
  payload: PushPayload
): Promise<{ expiredIds: string[] }> {
  const expiredIds: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async sub => {
      const ok = await sendWebPush(sub, payload);
      if (!ok) expiredIds.push(sub.id);
    })
  );

  return { expiredIds };
}
