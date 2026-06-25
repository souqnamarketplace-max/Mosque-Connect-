import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, canManageMosque } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculatePrayerTimes, toTimeString } from "@/lib/prayerCalculation";

const generateSchema = z.object({
  mosqueId: z.string().uuid(),
  ramadanYearHijri: z.number().int().min(1400).max(1600),
  startGregorianDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  taraweehTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mosqueId = searchParams.get("mosque_id");
  const year = searchParams.get("year");
  if (!mosqueId || !canManageMosque(ctx, mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  let query = supabase.from("ramadan_schedule").select("*").eq("mosque_id", mosqueId);
  if (year) query = query.eq("ramadan_year_hijri", Number(year));

  const { data, error } = await query.order("islamic_day", { ascending: true });
  if (error) return NextResponse.json({ error: "Failed to load schedule" }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * Auto-generates all 30 days of the Ramadan schedule from the mosque's
 * existing prayer calculation settings, rather than requiring an admin to
 * hand-enter 30 rows of 5+ times each. Suhoor end = Fajr Adhan time minus
 * a small buffer is NOT applied automatically (scholars differ on this);
 * Suhoor end is set equal to Fajr Adhan time, and admins can adjust
 * individual days afterward if their mosque follows a different convention.
 */
export async function POST(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  if (!canManageMosque(ctx, parsed.data.mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: mosque } = await supabase
    .from("mosques")
    .select("latitude, longitude, calculation_method, asr_juristic_method, high_latitude_rule")
    .eq("id", parsed.data.mosqueId)
    .single();

  if (!mosque || mosque.latitude == null || mosque.longitude == null) {
    return NextResponse.json({ error: "Mosque location is not set" }, { status: 400 });
  }

  const rows = [];
  const startDate = new Date(parsed.data.startGregorianDate + "T12:00:00Z");

  for (let day = 1; day <= 30; day++) {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + (day - 1));

    try {
      const times = calculatePrayerTimes(
        {
          latitude: Number(mosque.latitude),
          longitude: Number(mosque.longitude),
          calculationMethod: mosque.calculation_method,
          asrJuristicMethod: mosque.asr_juristic_method,
          highLatitudeRule: mosque.high_latitude_rule,
        },
        date
      );

      rows.push({
        mosque_id: parsed.data.mosqueId,
        ramadan_year_hijri: parsed.data.ramadanYearHijri,
        islamic_day: day,
        gregorian_date: date.toISOString().substring(0, 10),
        suhoor_end: toTimeString(times.fajr),
        iftar_time: toTimeString(times.maghrib),
        taraweeh_time: parsed.data.taraweehTime ? `${parsed.data.taraweehTime}:00` : null,
        fajr: toTimeString(times.fajr),
        dhuhr: toTimeString(times.dhuhr),
        asr: toTimeString(times.asr),
        maghrib: toTimeString(times.maghrib),
        isha: toTimeString(times.isha),
      });
    } catch {
      // Skip a day that fails calculation rather than aborting the whole batch.
    }
  }

  const { error } = await supabase
    .from("ramadan_schedule")
    .upsert(rows, { onConflict: "mosque_id,ramadan_year_hijri,islamic_day" });

  if (error) return NextResponse.json({ error: "Failed to generate schedule" }, { status: 500 });
  return NextResponse.json({ daysGenerated: rows.length });
}

const updateDaySchema = z.object({
  id: z.string().uuid(),
  suhoorEnd: z.string().optional(),
  iftarTime: z.string().optional(),
  taraweehTime: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = updateDaySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("ramadan_schedule")
    .select("mosque_id")
    .eq("id", parsed.data.id)
    .single();
  if (!existing || !canManageMosque(ctx, existing.mosque_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update: Record<string, string | null> = {};
  if (parsed.data.suhoorEnd) update.suhoor_end = parsed.data.suhoorEnd;
  if (parsed.data.iftarTime) update.iftar_time = parsed.data.iftarTime;
  if (parsed.data.taraweehTime !== undefined) update.taraweeh_time = parsed.data.taraweehTime;

  const { error } = await supabase.from("ramadan_schedule").update(update).eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: "Failed to update day" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
