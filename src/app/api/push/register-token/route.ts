/**
 * POST /api/push/register-token
 * Saves an FCM device token for native push (iOS/Android via Capacitor).
 * Called after Capacitor.PushNotifications.register() succeeds.
 *
 * Body: { token: string, platform: 'ios' | 'android' }
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

    const { token, platform } = await req.json();

    if (!token || !platform) {
      return NextResponse.json({ error: 'token and platform required' }, { status: 400 });
    }

    if (!['ios', 'android'].includes(platform)) {
      return NextResponse.json({ error: 'platform must be ios or android' }, { status: 400 });
    }

    // Upsert — one token per user per platform (per critical rule #4)
    const { error } = await supabase
      .from('device_tokens')
      .upsert(
        {
          user_id:    user.id,
          token,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[push/register-token] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
