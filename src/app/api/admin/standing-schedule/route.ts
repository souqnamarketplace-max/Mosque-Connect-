import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, canManageMosque } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/adminAudit";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, "Must be HH:MM or HH:MM:SS");

const createSchema = z
  .object({
    mosqueId: z.string().uuid(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    fajr: timeSchema,
    dhuhr: timeSchema,
    asr: timeSchema,
    isha: timeSchema,
    maghribFixed: timeSchema.optional(),
    maghribOffsetMinutes: z.number().int().min(-120).max(120).optional(),
    jumuah1Start: timeSchema.optional(),
    jumuah1End: timeSchema.optional(),
    jumuah2Start: timeSchema.optional(),
    jumuah2End: timeSchema.optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((v) => (v.maghribFixed != null) !== (v.maghribOffsetMinutes != null), {
    message: "Provide exactly one of maghribFixed or maghribOffsetMinutes",
  });

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mosqueId = searchParams.get("mosque_id");
  if (!mosqueId || !z.string().uuid().safeParse(mosqueId).success) {
    return NextResponse.json({ error: "mosque_id is required" }, { status: 400 });
  }
  if (!canManageMosque(ctx, mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("mosque_standing_schedules")
    .select("*")
    .eq("mosque_id", mosqueId)
    .order("effective_from", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to load standing schedules" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  if (!canManageMosque(ctx, parsed.data.mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();

  // Close out whatever open-ended schedule (if any) is currently active,
  // the day before this new one takes effect — the DB's unique partial
  // index also enforces "at most one open-ended schedule per mosque", this
  // just keeps the API from erroring on the second schedule a mosque ever
  // sets instead of requiring the admin to close the old one by hand first.
  const dayBefore = new Date(`${parsed.data.effectiveFrom}T12:00:00Z`);
  dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
  const dayBeforeStr = dayBefore.toISOString().substring(0, 10);

  await supabase
    .from("mosque_standing_schedules")
    .update({ effective_until: dayBeforeStr })
    .eq("mosque_id", parsed.data.mosqueId)
    .is("effective_until", null);

  const { data, error } = await supabase
    .from("mosque_standing_schedules")
    .insert({
      mosque_id: parsed.data.mosqueId,
      effective_from: parsed.data.effectiveFrom,
      fajr: parsed.data.fajr,
      dhuhr: parsed.data.dhuhr,
      asr: parsed.data.asr,
      isha: parsed.data.isha,
      maghrib_fixed: parsed.data.maghribFixed ?? null,
      maghrib_offset_minutes: parsed.data.maghribOffsetMinutes ?? null,
      jumuah_1_start: parsed.data.jumuah1Start ?? null,
      jumuah_1_end: parsed.data.jumuah1End ?? null,
      jumuah_2_start: parsed.data.jumuah2Start ?? null,
      jumuah_2_end: parsed.data.jumuah2End ?? null,
      notes: parsed.data.notes ?? null,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create standing schedule" }, { status: 500 });

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId: parsed.data.mosqueId,
    action: "standing_schedule.create",
    resourceType: "mosque_standing_schedule",
    resourceId: data.id,
    details: { effectiveFrom: parsed.data.effectiveFrom },
  });

  return NextResponse.json(data);
}
