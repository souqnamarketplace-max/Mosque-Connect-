import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/onboarding/mosque-location?mosque_id=xxx
 * Returns { province_id, city_id } so the preferences UI can
 * pre-select the correct province + city dropdowns on load.
 */
export async function GET(req: NextRequest) {
  const mosque_id = req.nextUrl.searchParams.get('mosque_id');
  if (!mosque_id) {
    return NextResponse.json({ error: 'mosque_id required' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('mosques')
    .select('city_id, cities(province_id)')
    .eq('id', mosque_id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const city_id = data.city_id;
  // @ts-ignore – Supabase join typing
  const province_id = data.cities?.province_id ?? null;

  return NextResponse.json({ city_id, province_id });
}
