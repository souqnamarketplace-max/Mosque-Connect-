import { NextResponse } from "next/server";
import { getOnboardingState } from "@/lib/onboardingState";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const { mosqueId } = await getOnboardingState();
  if (!mosqueId) return NextResponse.json([]);

  const supabase = await createServerSupabaseClient();
  const { data: opportunities, error } = await supabase
    .from("volunteer_opportunities")
    .select("id, title, description, category, coordinator_name")
    .eq("mosque_id", mosqueId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to load opportunities" }, { status: 500 });
  if (!opportunities || opportunities.length === 0) return NextResponse.json([]);

  const oppIds = opportunities.map((o) => o.id);
  const { data: shifts } = await supabase
    .from("volunteer_shifts")
    .select("id, opportunity_id, shift_date, start_time, end_time, capacity")
    .in("opportunity_id", oppIds)
    .gte("shift_date", new Date().toISOString().substring(0, 10))
    .order("shift_date", { ascending: true });

  const shiftIds = (shifts ?? []).map((s) => s.id);
  let countsByShift: Record<string, number> = {};
  if (shiftIds.length > 0) {
    const { data: signups } = await supabase
      .from("volunteer_signups")
      .select("shift_id")
      .in("shift_id", shiftIds)
      .eq("status", "confirmed");
    countsByShift = (signups ?? []).reduce((acc, s) => {
      acc[s.shift_id] = (acc[s.shift_id] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  const enrichedShifts = (shifts ?? []).map((s) => ({ ...s, signedUpCount: countsByShift[s.id] ?? 0 }));

  const result = opportunities.map((opp) => ({
    ...opp,
    shifts: enrichedShifts.filter((s) => s.opportunity_id === opp.id),
  }));

  return NextResponse.json(result);
}
