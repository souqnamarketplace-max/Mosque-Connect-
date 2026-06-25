import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryCode = searchParams.get("category");
  const lang = searchParams.get("lang") ?? "en";

  if (!categoryCode) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const todayStr = new Date().toISOString().substring(0, 10);

  const { data: category } = await supabase
    .from("dua_categories")
    .select("id, code, label_en, label_ar, label_ur")
    .eq("code", categoryCode)
    .eq("is_active", true)
    .single();

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const { data: contentRows } = await supabase
    .from("dua_content")
    .select("*")
    .eq("category_id", category.id)
    .eq("is_active", true)
    .or(`active_from.is.null,active_from.lte.${todayStr}`)
    .or(`active_to.is.null,active_to.gte.${todayStr}`)
    .order("created_at", { ascending: true });

  if (!contentRows || contentRows.length === 0) {
    return NextResponse.json({ error: "No content available" }, { status: 404 });
  }

  // Rotate deterministically by day-of-year so the same date always shows
  // the same item (consistent across multiple page loads in one day) but
  // the content actually varies day to day rather than being static.
  const startOfYear = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((Date.now() - startOfYear.getTime()) / 86400000);
  const content = contentRows[dayOfYear % contentRows.length];

  const textField = `text_${lang}` as "text_en" | "text_ar" | "text_ur";
  const text = content[textField] ?? content.text_en;

  return NextResponse.json({
    category: category.code,
    categoryLabel: lang === "ar" ? category.label_ar : lang === "ur" ? category.label_ur : category.label_en,
    text,
    transliteration: content.transliteration,
    sourceReference: content.source_reference,
  });
}
