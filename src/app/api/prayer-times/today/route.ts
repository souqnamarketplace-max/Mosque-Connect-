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
    .select("id, timezone, is_active")
    .eq("id", parsed.data.mosque_id)
    .single();

  if (mosqueError || !mosque || !mosque.is_active) {
    return NextResponse.json({ error: "Mosque not found" }, { status: 404 });
  }

  // "Today" computed in the mosque's own timezone, not the server's.
  const todayInMosqueTz = new Date(
    new Date().toLocaleString("en-US", { timeZone: mosque.timezone })
  );
  const dateStr = todayInMosqueTz.toISOString().substring(0, 10);

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

  return NextResponse.json({
    date: dateStr,
    timezone: mosque.timezone,
    adhan: {
      fajr: prayerRow.fajr,
      sunrise: prayerRow.sunrise,
      dhuhr: prayerRow.dhuhr,
      asr: prayerRow.asr,
      maghrib: prayerRow.maghrib,
      isha: prayerRow.isha,
    },
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
