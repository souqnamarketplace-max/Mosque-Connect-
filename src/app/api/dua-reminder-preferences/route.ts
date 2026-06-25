import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/userAuth";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  enabled_categories: z.array(z.string()).optional(),
  preferred_language: z.enum(["en", "ar", "ur"]).optional(),
  reminder_times: z.record(z.string(), z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)).optional(),
});

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session. Call /api/auth/ensure-session first." }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("dua_reminder_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }

  return NextResponse.json(
    data ?? {
      user_id: userId,
      enabled: true,
      enabled_categories: [],
      preferred_language: "en",
      reminder_times: {},
    }
  );
}

export async function PATCH(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session. Call /api/auth/ensure-session first." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  let cleanCategories = parsed.data.enabled_categories;
  if (cleanCategories) {
    const { data: validCats } = await supabase
      .from("dua_categories")
      .select("code")
      .eq("is_active", true);
    const validCodes = new Set((validCats ?? []).map((c) => c.code));
    cleanCategories = cleanCategories.filter((c) => validCodes.has(c));
  }

  let cleanTimes = parsed.data.reminder_times;
  if (cleanTimes && cleanCategories) {
    const allowed = new Set(cleanCategories);
    cleanTimes = Object.fromEntries(Object.entries(cleanTimes).filter(([k]) => allowed.has(k)));
  }

  const update = {
    ...parsed.data,
    enabled_categories: cleanCategories,
    reminder_times: cleanTimes,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from("dua_reminder_preferences")
    .upsert(update, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }

  return NextResponse.json(data);
}
