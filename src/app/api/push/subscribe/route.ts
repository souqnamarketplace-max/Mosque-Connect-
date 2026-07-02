/**
 * POST /api/push/subscribe
 * Saves a Web Push subscription for the current user.
 * Called by the client after the browser grants push permission.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint, p256dh, auth_key, platform } = await req.json();

    if (!endpoint || !p256dh || !auth_key) {
      return NextResponse.json({ error: 'Missing subscription fields' }, { status: 400 });
    }

    // Upsert — one subscription per endpoint per user
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id:     user.id,
          endpoint,
          p256dh,
          auth_key,
          platform:    platform ?? 'web',
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[push/subscribe] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Unsubscribe — delete by endpoint
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 });

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[push/subscribe] DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
