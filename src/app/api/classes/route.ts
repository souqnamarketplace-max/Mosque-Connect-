import { NextResponse } from "next/server";
import { getOnboardingState } from "@/lib/onboardingState";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerDict } from "@/lib/i18n/getServerDict";
import { resolveLocalizedFieldsForList } from "@/lib/localizedFields";

export async function GET() {
  const { mosqueId } = await getOnboardingState();
  if (!mosqueId) return NextResponse.json([]);
  const { language } = await getServerDict();

  const supabase = await createServerSupabaseClient();
  const { data: classes, error } = await supabase
    .from("islamic_classes")
    .select(
      "id, title, title_ar, title_ur, description, description_ar, description_ur, instructor_name, age_group, schedule_note, schedule_note_ar, schedule_note_ur, start_date, end_date, capacity, location"
    )
    .eq("mosque_id", mosqueId)
    .eq("is_active", true)
    .order("start_date", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to load classes" }, { status: 500 });

  const localizedClasses = resolveLocalizedFieldsForList(classes ?? [], ["title", "description", "schedule_note"], language);

  const classIds = localizedClasses.map((c) => c.id);
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

  const enriched = localizedClasses.map((c) => ({ ...c, registeredCount: countsById[c.id] ?? 0 }));
  return NextResponse.json(enriched);
}
