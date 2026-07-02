/**
 * POST /api/push/send
 * Internal endpoint — sends Web Push to a mosque's subscribers or specific users.
 * Called by announcement/event/emergency creation routes, NOT directly by clients.
 *
 * Body: {
 *   mosque_id?: string        — send to all subscribers of this mosque
 *   user_ids?: string[]       — send to specific users (overrides mosque_id)
 *   title: string
 *   body: string
 *   url?: string              — deep link on tap
 *   category?: 'announcement' | 'event' | 'emergency' | 'athan' | 'dua' | 'general'
 *   cron_secret?: string      — if called from cron job
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendWebPushToUsers } from '@/lib/push/web-push-sender';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mosque_id, user_ids, title, body: msgBody, url, category, cron_secret } = body;

    // Auth check — either a logged-in mosque admin or a cron job
    const isCron = cron_secret && cron_secret === process.env.CRON_SECRET
                   && cron_secret !== 'PLACEHOLDER_CRON_SECRET';

    if (!isCron) {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Optional: verify user is mosque admin for mosque_id
    }

    if (!title || !msgBody) {
      return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // ── Fetch target subscriptions ────────────────────────────────────────
    let query = serviceClient
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth_key');

    if (user_ids?.length) {
      query = query.in('user_id', user_ids);
    } else if (mosque_id) {
      // Get all user_ids subscribed to this mosque
      const { data: subs } = await serviceClient
        .from('user_mosque_subscriptions')
        .select('user_id')
        .eq('mosque_id', mosque_id);

      const ids = (subs ?? []).map(s => s.user_id);
      if (!ids.length) return NextResponse.json({ sent: 0 });

      query = query.in('user_id', ids);
    } else {
      return NextResponse.json({ error: 'mosque_id or user_ids required' }, { status: 400 });
    }

    const { data: subscriptions, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!subscriptions?.length) return NextResponse.json({ sent: 0 });

    // ── Send ──────────────────────────────────────────────────────────────
    const payload = { title, body: msgBody, url: url ?? '/', category: category ?? 'general' };
    const { expiredIds } = await sendWebPushToUsers(subscriptions, payload);

    // ── Clean up expired subscriptions ───────────────────────────────────
    if (expiredIds.length) {
      await serviceClient
        .from('push_subscriptions')
        .delete()
        .in('id', expiredIds);
    }

    // ── Log delivery ──────────────────────────────────────────────────────
    if (mosque_id) {
      const logs = subscriptions
        .filter(s => !expiredIds.includes(s.id))
        .map(s => ({
          user_id:   s.user_id,
          mosque_id,
          category:  category ?? 'general',
          title,
          body:      msgBody,
          status:    'sent',
          sent_at:   new Date().toISOString(),
        }));

      if (logs.length) {
        await serviceClient.from('notification_delivery_log').insert(logs);
      }
    }

    return NextResponse.json({
      sent:    subscriptions.length - expiredIds.length,
      expired: expiredIds.length,
    });
  } catch (err) {
    console.error('[push/send] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
