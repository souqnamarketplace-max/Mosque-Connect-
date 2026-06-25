import { NextResponse } from "next/server";
import { getOnboardingState } from "@/lib/onboardingState";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const { mosqueId } = await getOnboardingState();
  if (!mosqueId) return NextResponse.json({ live: null, recordings: [] });

  const supabase = await createServerSupabaseClient();

  const { data: live } = await supabase
    .from("live_streams")
    .select("id, title, source, stream_url, started_at")
    .eq("mosque_id", mosqueId)
    .eq("is_live", true)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: recordings } = await supabase
    .from("live_streams")
    .select("id, title, source, recording_url, ended_at")
    .eq("mosque_id", mosqueId)
    .eq("is_live", false)
    .not("recording_url", "is", null)
    .order("ended_at", { ascending: false })
    .limit(10);

  return NextResponse.json({ live: live ?? null, recordings: recordings ?? [] });
}
