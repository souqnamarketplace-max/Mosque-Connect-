import { NextRequest, NextResponse } from "next/server";
import { getOnboardingState } from "@/lib/onboardingState";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerDict } from "@/lib/i18n/getServerDict";
import { resolveLocalizedFieldsForList } from "@/lib/localizedFields";

export async function GET(request: NextRequest) {
  const { mosqueId } = await getOnboardingState();
  if (!mosqueId) return NextResponse.json([]);

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "50");
  const { language } = await getServerDict();

  const supabase = await createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("announcements")
    .select(
      "id, category, title, title_ar, title_ur, body, body_ar, body_ur, image_url, pdf_url, link_url, is_pinned, publish_at, deceased_name, burial_time, burial_location, couple_names, ceremony_time, ceremony_location"
    )
    .eq("mosque_id", mosqueId)
    .lte("publish_at", nowIso)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("is_pinned", { ascending: false })
    .order("publish_at", { ascending: false })
    .limit(Math.min(limit, 100));

  if (error) return NextResponse.json({ error: "Failed to load announcements" }, { status: 500 });
  return NextResponse.json(resolveLocalizedFieldsForList(data ?? [], ["title", "body"], language));
}
