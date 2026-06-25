import { NextResponse } from "next/server";
import { getOnboardingState } from "@/lib/onboardingState";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const { language, mosqueId } = await getOnboardingState();

  if (!mosqueId) {
    return NextResponse.json({ language, mosque: null, city: null, province: null });
  }

  const supabase = await createServerSupabaseClient();
  const { data: mosque } = await supabase
    .from("mosques")
    .select("id, name, city_id")
    .eq("id", mosqueId)
    .single();

  if (!mosque) {
    return NextResponse.json({ language, mosque: null, city: null, province: null });
  }

  const { data: city } = await supabase
    .from("cities")
    .select("id, name, name_ar, name_ur, province_id")
    .eq("id", mosque.city_id)
    .single();

  let province = null;
  if (city) {
    const { data: provinceRow } = await supabase
      .from("provinces")
      .select("id, name, name_ar, name_ur, code")
      .eq("id", city.province_id)
      .single();
    province = provinceRow;
  }

  return NextResponse.json({
    language,
    mosque: { id: mosque.id, name: mosque.name },
    city: city ? { id: city.id, name: city.name, name_ar: city.name_ar, name_ur: city.name_ur } : null,
    province,
  });
}
