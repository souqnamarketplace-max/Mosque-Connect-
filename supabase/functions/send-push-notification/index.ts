/**
 * supabase/functions/send-push-notification/index.ts
 *
 * Sends a push notification to a user via FCM (Firebase Admin SDK).
 * Uses service_role key to bypass RLS when reading device_tokens.
 *
 * Expected payload: { user_email, title, body }
 * (rule #3 — NOT { token, platform })
 *
 * ── PLACEHOLDER SETUP ──────────────────────────────────────────────────────
 * Before going live:
 * 1. Store Firebase service account JSON in Supabase Vault:
 *    Dashboard → Edge Functions → Secrets → Add secret
 *    Name: FIREBASE_SERVICE_ACCOUNT_JSON
 *    Value: (paste the full JSON from Firebase Console → Project Settings → Service Accounts)
 *
 * 2. Deploy this function:
 *    supabase functions deploy send-push-notification
 * ─────────────────────────────────────────────────────────────────────────
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── PLACEHOLDER — replace with real secret from Supabase Vault ────────────────
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')
  ?? 'PLACEHOLDER_FIREBASE_SERVICE_ACCOUNT_JSON';

const SUPABASE_URL = 'https://aytunqgqpyatslsrkfnc.supabase.co'; // hardcoded (rule #8)
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req: Request) => {
  try {
    const { user_email, title, body } = await req.json();

    if (!user_email || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'user_email, title, and body are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Skip if placeholder (dev mode)
    if (FIREBASE_SERVICE_ACCOUNT === 'PLACEHOLDER_FIREBASE_SERVICE_ACCOUNT_JSON') {
      console.warn('[send-push] Firebase not configured — skipping (placeholder mode)');
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use service_role to read device_tokens (bypasses RLS — rule #10)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Look up user_id by email, then get their device token (rule #3)
    const { data: userData } = await supabase.auth.admin.listUsers();
    const user = userData?.users?.find((u: any) => u.email === user_email);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    const { data: tokenRows, error: tokenError } = await supabase
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', user.id);

    if (tokenError || !tokenRows?.length) {
      return new Response(JSON.stringify({ error: 'No device token found' }), { status: 404 });
    }

    // Send to all devices for this user
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    const results = await Promise.allSettled(
      tokenRows.map(({ token }: { token: string }) =>
        sendFCM(serviceAccount, token, title, body)
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return new Response(JSON.stringify({ sent }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-push] error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ── Firebase Admin SDK via REST ───────────────────────────────────────────────
async function sendFCM(
  serviceAccount: any,
  token: string,
  title: string,
  body: string
): Promise<void> {
  // Get OAuth2 token for Firebase
  const accessToken = await getFirebaseAccessToken(serviceAccount);

  const projectId = serviceAccount.project_id;
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        android: { priority: 'high' },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`FCM error: ${err}`);
  }
}

async function getFirebaseAccessToken(serviceAccount: any): Promise<string> {
  // JWT for Firebase OAuth — Deno compatible
  const { private_key, client_email } = serviceAccount;
  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));

  // Sign with RS256 — using Web Crypto API (Deno compatible)
  const keyData = private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');

  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const { access_token } = await tokenRes.json();
  return access_token;
}
