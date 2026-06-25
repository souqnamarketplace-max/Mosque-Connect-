import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/userAuth";

const PRAYER_CODES = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

const patchSchema = z.object({
  mosque_id: z.string().uuid().optional(),
  athan_enabled: z.boolean().optional(),
  athan_voice_id: z.string().uuid().nullable().optional(),
  volume: z.number().min(0).max(1).optional(),
  alert_mode: z.enum(["sound", "vibration_only", "notification_only", "muted"]).optional(),
  per_prayer_overrides: z
    .record(z.string(), z.object({ enabled: z.boolean().optional(), alert_mode: z.string().optional() }))
    .optional(),
});

/** Strips any per_prayer_overrides keys that aren't one of the five canonical prayer codes. */
function sanitizeOverrides(overrides: Record<string, unknown> | undefined) {
  if (!overrides) return undefined;
  const clean: Record<string, unknown> = {};
  for (const key of Object.keys(overrides)) {
    if ((PRAYER_CODES as readonly string[]).includes(key)) {
      clean[key] = overrides[key];
    }
  }
  return clean;
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session. Call /api/auth/ensure-session first." }, { status: 401 });
  }

  // Uses the regular RLS-respecting client now — the athan_prefs_own_row
  // policy (user_id = auth.uid()) does the ownership enforcement, so this
  // route no longer needs the service-role client or manual checks.
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("athan_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }

  return NextResponse.json(
    data ?? {
      user_id: userId,
      mosque_id: null,
      athan_enabled: true,
      athan_voice_id: null,
      volume: 0.8,
      alert_mode: "sound",
      per_prayer_overrides: {},
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

  const update = {
    ...parsed.data,
    per_prayer_overrides: sanitizeOverrides(parsed.data.per_prayer_overrides),
    user_id: userId, // always forced server-side from the session — client cannot override this
  };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("athan_preferences")
    .upsert(update, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }

  return NextResponse.json(data);
}
