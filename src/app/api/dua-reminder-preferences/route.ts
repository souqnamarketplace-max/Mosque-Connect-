import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { getAuthorizedDeviceId } from "@/lib/deviceAuth";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  enabled_categories: z.array(z.string()).optional(),
  preferred_language: z.enum(["en", "ar", "ur"]).optional(),
  reminder_times: z.record(z.string(), z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)).optional(),
});

export async function GET() {
  const deviceId = await getAuthorizedDeviceId();
  if (!deviceId) {
    return NextResponse.json({ error: "No device session. Call /api/device/init first." }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("dua_reminder_preferences")
    .select("*")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }

  return NextResponse.json(
    data ?? {
      device_id: deviceId,
      enabled: true,
      enabled_categories: [],
      preferred_language: "en",
      reminder_times: {},
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

  const supabase = createServiceRoleClient();

  // Validate enabled_categories against real, active categories before storing.
  let cleanCategories = parsed.data.enabled_categories;
  if (cleanCategories) {
    const { data: validCats } = await supabase
      .from("dua_categories")
      .select("code")
      .eq("is_active", true);
    const validCodes = new Set((validCats ?? []).map((c) => c.code));
    cleanCategories = cleanCategories.filter((c) => validCodes.has(c));
  }

  // reminder_times entries are only kept for categories that are actually enabled.
  let cleanTimes = parsed.data.reminder_times;
  if (cleanTimes && cleanCategories) {
    const allowed = new Set(cleanCategories);
    cleanTimes = Object.fromEntries(Object.entries(cleanTimes).filter(([k]) => allowed.has(k)));
  }

  const update = {
    ...parsed.data,
    enabled_categories: cleanCategories,
    reminder_times: cleanTimes,
    device_id: deviceId,
  };

  const { data, error } = await supabase
    .from("dua_reminder_preferences")
    .upsert(update, { onConflict: "device_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }

  return NextResponse.json(data);
}
