import { NextResponse } from "next/server";
import { getOnboardingState } from "@/lib/onboardingState";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const { mosqueId } = await getOnboardingState();
  if (!mosqueId) return NextResponse.json([]);

  const supabase = await createServerSupabaseClient();
  const { data: classes, error } = await supabase
    .from("islamic_classes")
    .select("id, title, description, instructor_name, age_group, schedule_note, start_date, end_date, capacity, location")
    .eq("mosque_id", mosqueId)
    .eq("is_active", true)
    .order("start_date", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to load classes" }, { status: 500 });

  const classIds = (classes ?? []).map((c) => c.id);
  let countsById: Record<string, number> = {};
  if (classIds.length > 0) {
    const { data: regs } = await supabase
      .from("class_registrations")
      .select("class_id")
      .in("class_id", classIds)
      .eq("status", "registered");
    countsById = (regs ?? []).reduce((acc, r) => {
      acc[r.class_id] = (acc[r.class_id] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  const enriched = (classes ?? []).map((c) => ({ ...c, registeredCount: countsById[c.id] ?? 0 }));
  return NextResponse.json(enriched);
}
