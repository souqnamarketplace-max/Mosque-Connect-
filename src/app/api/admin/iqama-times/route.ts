import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, canManageMosque } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/adminAudit";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, "Must be HH:MM or HH:MM:SS");

const upsertSchema = z.object({
  mosqueId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fajr: timeSchema,
  dhuhr: timeSchema,
  asr: timeSchema,
  maghrib: timeSchema,
  isha: timeSchema,
  jumuahKhutbahTime: timeSchema.nullable().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mosqueId = searchParams.get("mosque_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!mosqueId || !z.string().uuid().safeParse(mosqueId).success) {
    return NextResponse.json({ error: "mosque_id is required" }, { status: 400 });
  }
  if (!canManageMosque(ctx, mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("iqama_times")
    .select("*")
    .eq("mosque_id", mosqueId)
    .order("iqama_date", { ascending: true });

  if (from) query = query.gte("iqama_date", from);
  if (to) query = query.lte("iqama_date", to);

  const { data, error } = await query.limit(31);
  if (error) return NextResponse.json({ error: "Failed to load iqama times" }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { mosqueId, date, ...times } = parsed.data;

  if (!canManageMosque(ctx, mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validation rule (Functional Spec 2.3.1): date cannot be more than 1 year out.
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (new Date(date) > oneYearFromNow) {
    return NextResponse.json({ error: "Date cannot be more than 1 year in the future" }, { status: 400 });
  }

  // Validation rule: jumuah_khutbah_time must be <= dhuhr (iqama) time if set.
  if (times.jumuahKhutbahTime && times.jumuahKhutbahTime > times.dhuhr) {
    return NextResponse.json(
      { error: "Khutbah time must be at or before the Jumu'ah Iqama time" },
      { status: 400 }
    );
  }

  const supabase = await createServerSupabaseClient();

  // Validation rule: warn (don't block) if iqama < corresponding adhan time.
  const { data: prayerRow } = await supabase
    .from("prayer_times")
    .select("fajr, dhuhr, asr, maghrib, isha")
    .eq("mosque_id", mosqueId)
    .eq("prayer_date", date)
    .maybeSingle();

  const warnings: string[] = [];
  if (prayerRow) {
    for (const prayer of ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const) {
      if (times[prayer] < prayerRow[prayer]) {
        warnings.push(`${prayer} Iqama is earlier than its Adhan time`);
      }
    }
  }

  const { data, error } = await supabase
    .from("iqama_times")
    .upsert(
      {
        mosque_id: mosqueId,
        iqama_date: date,
        fajr: times.fajr,
        dhuhr: times.dhuhr,
        asr: times.asr,
        maghrib: times.maghrib,
        isha: times.isha,
        jumuah_khutbah_time: times.jumuahKhutbahTime ?? null,
        notes: times.notes ?? null,
        updated_by: ctx.userId,
      },
      { onConflict: "mosque_id,iqama_date" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save iqama times" }, { status: 500 });
  }

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId,
    action: "iqama_times.upsert",
    resourceType: "iqama_times",
    resourceId: data.id,
    details: { date, warnings },
  });

  return NextResponse.json({ ...data, warnings });
}
