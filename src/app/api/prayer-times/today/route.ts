import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const querySchema = z.object({
  mosque_id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ mosque_id: searchParams.get("mosque_id") });

  if (!parsed.success) {
    return NextResponse.json({ error: "mosque_id must be a valid UUID" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data: mosque, error: mosqueError } = await supabase
    .from("mosques")
    .select("id, timezone, is_active, latitude, longitude")
    .eq("id", parsed.data.mosque_id)
    .single();

  if (mosqueError || !mosque || !mosque.is_active) {
    return NextResponse.json({ error: "Mosque not found" }, { status: 404 });
  }

  // "Today" computed in the mosque's own timezone, not the server's.
  // Use Intl.DateTimeFormat to get the correct YYYY-MM-DD for that timezone
  // directly from the current instant, avoiding the classic bug of
  // round-tripping through toLocaleString + `new Date(...)` (which
  // re-parses a localized string as if it were UTC and silently shifts
  // the date near midnight).
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: mosque.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // en-CA locale formats as YYYY-MM-DD directly

  const { data: prayerRow, error: prayerError } = await supabase
    .from("prayer_times")
    .select("fajr, sunrise, dhuhr, asr, maghrib, isha")
    .eq("mosque_id", mosque.id)
    .eq("prayer_date", dateStr)
    .single();

  if (prayerError || !prayerRow) {
    return NextResponse.json(
      { error: "Prayer times unavailable for today", date: dateStr },
      { status: 404 }
    );
  }

  const { data: iqamaRow } = await supabase
    .from("iqama_times")
    .select("fajr, dhuhr, asr, maghrib, isha, is_jumuah, jumuah_khutbah_time")
    .eq("mosque_id", mosque.id)
    .eq("iqama_date", dateStr)
    .single();

  // Tomorrow's Fajr is needed (not today's) to correctly compute the last
  // third of tonight: the Islamic "night" runs from today's Maghrib to
  // TOMORROW's Fajr, not today's — today's Fajr already happened before
  // today's Maghrib even occurs.
  const tomorrow = new Date(`${dateStr}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().substring(0, 10);

  const { data: tomorrowPrayerRow } = await supabase
    .from("prayer_times")
    .select("fajr")
    .eq("mosque_id", mosque.id)
    .eq("prayer_date", tomorrowStr)
    .single();

  return NextResponse.json({
    date: dateStr,
    timezone: mosque.timezone,
    latitude: mosque.latitude,
    longitude: mosque.longitude,
    adhan: {
      fajr: prayerRow.fajr,
      sunrise: prayerRow.sunrise,
      dhuhr: prayerRow.dhuhr,
      asr: prayerRow.asr,
      maghrib: prayerRow.maghrib,
      isha: prayerRow.isha,
    },
    tomorrowFajr: tomorrowPrayerRow?.fajr ?? null,
    iqama: iqamaRow
      ? {
          fajr: iqamaRow.fajr,
          dhuhr: iqamaRow.dhuhr,
          asr: iqamaRow.asr,
          maghrib: iqamaRow.maghrib,
          isha: iqamaRow.isha,
        }
      : null,
    isJumuah: iqamaRow?.is_jumuah ?? false,
    khutbahTime: iqamaRow?.jumuah_khutbah_time ?? null,
  });
}
