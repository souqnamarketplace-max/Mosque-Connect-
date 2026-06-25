import { NextRequest, NextResponse } from "next/server";
import { getOnboardingState } from "@/lib/onboardingState";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { mosqueId } = await getOnboardingState();
  if (!mosqueId) return NextResponse.json([]);

  const { searchParams } = new URL(request.url);
  const upcoming = searchParams.get("upcoming") === "true";
  const limit = Number(searchParams.get("limit") ?? "50");

  const supabase = await createServerSupabaseClient();
  const todayStr = new Date().toISOString().substring(0, 10);

  let query = supabase
    .from("events")
    .select("id, title, description, category, event_date, start_time, end_time, location, speaker, registration_url, image_url")
    .eq("mosque_id", mosqueId);

  query = upcoming
    ? query.gte("event_date", todayStr).order("event_date", { ascending: true })
    : query.lt("event_date", todayStr).order("event_date", { ascending: false });

  const { data, error } = await query.limit(Math.min(limit, 100));
  if (error) return NextResponse.json({ error: "Failed to load events" }, { status: 500 });

  return NextResponse.json(data);
}
