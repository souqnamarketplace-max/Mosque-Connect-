import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Selects which dua category to feature on the Home Screen right now, per
 * Functional Spec 4.2.1:
 *   - Friday, any time -> friday_reminder takes priority
 *   - before 12:00 local -> morning_dua
 *   - after 16:00 local -> evening_dua
 *   - otherwise -> prayer_motivation (safe default, also the no-content fallback)
 */
function resolveCategoryCode(now: Date): string {
  const isFriday = now.getDay() === 5;
  if (isFriday) return "friday_reminder";
  const hour = now.getHours();
  if (hour < 12) return "morning_dua";
  if (hour >= 16) return "evening_dua";
  return "prayer_motivation";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") ?? "en";

  const supabase = await createServerSupabaseClient();
  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);

  const primaryCode = resolveCategoryCode(now);

  async function fetchForCategory(code: string) {
    const { data: category } = await supabase
      .from("dua_categories")
      .select("id, code, label_en, label_ar, label_ur")
      .eq("code", code)
      .eq("is_active", true)
      .single();

    if (!category) return null;

    const { data: content } = await supabase
      .from("dua_content")
      .select("*")
      .eq("category_id", category.id)
      .eq("is_active", true)
      .or(`active_from.is.null,active_from.lte.${todayStr}`)
      .or(`active_to.is.null,active_to.gte.${todayStr}`)
      .limit(1)
      .maybeSingle();

    if (!content) return null;
    return { category, content };
  }

  let result = await fetchForCategory(primaryCode);

  // Fallback per state table 4.3 "no_content_for_window": if the resolved
  // category has no matching content row, fall back to prayer_motivation
  // rather than showing an empty card.
  if (!result && primaryCode !== "prayer_motivation") {
    result = await fetchForCategory("prayer_motivation");
  }

  if (!result) {
    return NextResponse.json({ error: "No dua content available" }, { status: 404 });
  }

  const textField = `text_${lang}` as "text_en" | "text_ar" | "text_ur";
  const text = result.content[textField] ?? result.content.text_en;

  return NextResponse.json({
    category: result.category.code,
    categoryLabel:
      lang === "ar" ? result.category.label_ar : lang === "ur" ? result.category.label_ur : result.category.label_en,
    text,
    transliteration: result.content.transliteration,
    sourceReference: result.content.source_reference,
    audioUrl: result.content.audio_url,
  });
}
