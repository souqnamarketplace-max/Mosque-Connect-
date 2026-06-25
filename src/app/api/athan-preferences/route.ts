import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getAuthorizedDeviceId } from "@/lib/deviceAuth";

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
  const deviceId = await getAuthorizedDeviceId();
  if (!deviceId) {
    return NextResponse.json({ error: "No device session. Call /api/device/init first." }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("athan_preferences")
    .select("*")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }

  // Default shape if this device has never saved preferences yet.
  return NextResponse.json(
    data ?? {
      device_id: deviceId,
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
  const deviceId = await getAuthorizedDeviceId();
  if (!deviceId) {
    return NextResponse.json({ error: "No device session. Call /api/device/init first." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const update = {
    ...parsed.data,
    per_prayer_overrides: sanitizeOverrides(parsed.data.per_prayer_overrides),
    device_id: deviceId, // always forced to the cookie's device_id — client cannot override this
  };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("athan_preferences")
    .upsert(update, { onConflict: "device_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }

  return NextResponse.json(data);
}
