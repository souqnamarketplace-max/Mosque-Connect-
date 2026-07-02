'use client';

import { useEffect, useState } from 'react';
import { isCapacitorNative, supportsWebPush, urlBase64ToUint8Array } from '@/lib/push/platform';

const SESSION_KEY = 'mc_push_prompted';

export default function PushPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    // Only run on web (not native — native handles its own permission)
    if (isCapacitorNative() || !supportsWebPush()) return;

    // Already prompted this session
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // Already granted or denied
    if (Notification.permission === 'granted') {
      registerWebPush();
      return;
    }
    if (Notification.permission === 'denied') return;

    // Show prompt after 3s delay
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  async function handleAllow() {
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(false);

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerWebPush();
    } else {
      setDenied(true);
      setTimeout(() => setDenied(false), 5000);
    }
  }

  function handleDismiss() {
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(false);
  }

  if (!visible && !denied) return null;

  // ── Denied toast (one-time per session) ──────────────────────────────────
  if (denied) {
    return (
      <div className="push-toast push-toast--denied" role="alert">
        <span>To enable notifications: Settings → Masjid Connect → Notifications</span>
        <button onClick={() => setDenied(false)} aria-label="Dismiss">✕</button>
        <style>{toastStyles}</style>
      </div>
    );
  }

  // ── Permission prompt ─────────────────────────────────────────────────────
  return (
    <div className="push-prompt" role="dialog" aria-modal="true" aria-label="Enable notifications">
      <div className="push-prompt__icon">🔔</div>
      <h3 className="push-prompt__title">Stay connected with your mosque</h3>
      <p className="push-prompt__body">
        Get notified about prayer times, announcements, and events.
      </p>
      <div className="push-prompt__actions">
        <button className="push-btn push-btn--allow" onClick={handleAllow}>
          Allow notifications
        </button>
        <button className="push-btn push-btn--skip" onClick={handleDismiss}>
          Not now
        </button>
      </div>
      <style>{promptStyles}</style>
    </div>
  );
}

// ── Register web push subscription ───────────────────────────────────────────
async function registerWebPush() {
  try {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey || vapidKey === 'PLACEHOLDER_VAPID_PUBLIC_KEY') {
      console.warn('[push] VAPID key not set — skipping registration');
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await saveSubscription(existing);
      return;
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    await saveSubscription(sub);
  } catch (err) {
    console.error('[push] registration error:', err);
  }
}

async function saveSubscription(sub: PushSubscription) {
  const key = sub.getKey('p256dh');
  const auth = sub.getKey('auth');
  if (!key || !auth) return;

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint:  sub.endpoint,
      p256dh:    btoa(String.fromCharCode(...new Uint8Array(key))),
      auth_key:  btoa(String.fromCharCode(...new Uint8Array(auth))),
      platform:  'web',
    }),
  });
}

// ── Styles ────────────────────────────────────────────────────────────────────
const promptStyles = `
  .push-prompt {
    position: fixed;
    bottom: 80px; /* above bottom nav */
    left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 2rem);
    max-width: 380px;
    background: var(--color-surface, #fff);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    padding: 1.5rem;
    text-align: center;
    z-index: 999;
    animation: slideUp 0.3s ease;
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  .push-prompt__icon { font-size: 2rem; margin-bottom: 0.5rem; }
  .push-prompt__title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-ink, #1a1a1a);
    margin: 0 0 0.5rem;
  }
  .push-prompt__body {
    font-size: 0.875rem;
    color: var(--color-ink-muted, #666);
    margin: 0 0 1.25rem;
    line-height: 1.5;
  }
  .push-prompt__actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .push-btn {
    padding: 0.875rem;
    border-radius: 10px;
    font-size: 0.9375rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    min-height: 48px;
  }
  .push-btn--allow {
    background: var(--color-emerald, #1b4332);
    color: #fff;
  }
  .push-btn--skip {
    background: transparent;
    color: var(--color-ink-muted, #666);
  }
`;

const toastStyles = `
  .push-toast {
    position: fixed;
    bottom: 80px;
    left: 1rem;
    right: 1rem;
    max-width: 380px;
    margin: 0 auto;
    padding: 0.875rem 1rem;
    border-radius: 10px;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    z-index: 999;
    animation: slideUp 0.3s ease;
  }
  .push-toast--denied {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffc107;
  }
  .push-toast button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    flex-shrink: 0;
    color: inherit;
  }
`;
