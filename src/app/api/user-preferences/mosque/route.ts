import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mosque_id } = await req.json();
    if (!mosque_id) {
      return NextResponse.json({ error: 'mosque_id is required' }, { status: 400 });
    }

    // Verify mosque exists and is active
    const { data: mosque, error: mosqueError } = await supabase
      .from('mosques')
      .select('id, name')
      .eq('id', mosque_id)
      .eq('is_active', true)
      .single();

    if (mosqueError || !mosque) {
      return NextResponse.json({ error: 'Mosque not found' }, { status: 404 });
    }

    // Unset all existing primary mosques for this user
    const { error: unsetError } = await supabase
      .from('user_mosque_subscriptions')
      .update({ is_primary: false })
      .eq('user_id', user.id);

    if (unsetError) throw unsetError;

    // Upsert the new primary mosque
    const { error: upsertError } = await supabase
      .from('user_mosque_subscriptions')
      .upsert(
        { user_id: user.id, mosque_id, is_primary: true },
        { onConflict: 'user_id,mosque_id' }
      );

    if (upsertError) throw upsertError;

    return NextResponse.json({ success: true, mosque_id, mosque_name: mosque.name });
  } catch (err) {
    console.error('[user-preferences/mosque] PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
