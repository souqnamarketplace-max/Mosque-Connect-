import { NextRequest, NextResponse } from "next/server";
import { getOnboardingState } from "@/lib/onboardingState";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { gregorianToHijri } from "@/lib/hijriDate";

export async function GET(request: NextRequest) {
  const { mosqueId } = await getOnboardingState();
  if (!mosqueId) return NextResponse.json([]);

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  // Default to the current Hijri year so the page works without a query param.
  const ramadanYear = yearParam ? Number(yearParam) : gregorianToHijri(new Date()).year;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("ramadan_schedule")
    .select("*")
    .eq("mosque_id", mosqueId)
    .eq("ramadan_year_hijri", ramadanYear)
    .order("islamic_day", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to load Ramadan schedule" }, { status: 500 });
  return NextResponse.json({ ramadanYear, days: data });
}
