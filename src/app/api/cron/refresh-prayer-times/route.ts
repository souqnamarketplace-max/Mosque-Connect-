import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { calculatePrayerTimes, toTimeString } from "@/lib/prayerCalculation";

/**
 * Runs daily via Vercel Cron (see vercel.json). For every active mosque,
 * ensures prayer_times rows exist for today through +13 days (14-day rolling
 * window), so the app never 404s on "today" the way it did before this job
 * existed. Skips any date where is_manual_override = true, per spec 2.2.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { data: mosques, error } = await supabase
    .from("mosques")
    .select("id, latitude, longitude, calculation_method, asr_juristic_method, high_latitude_rule")
    .eq("is_active", true);

  if (error || !mosques) {
    return NextResponse.json({ error: "Failed to load mosques" }, { status: 500 });
  }

  const results: Array<{ mosqueId: string; datesWritten: number; errors: string[] }> = [];

  for (const mosque of mosques) {
    if (mosque.latitude == null || mosque.longitude == null) continue;

    const errors: string[] = [];
    let datesWritten = 0;

    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + i);
      const dateStr = date.toISOString().substring(0, 10);

      // Skip dates an admin has manually overridden.
      const { data: existing } = await supabase
        .from("prayer_times")
        .select("is_manual_override")
        .eq("mosque_id", mosque.id)
        .eq("prayer_date", dateStr)
        .maybeSingle();

      if (existing?.is_manual_override) continue;

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

        await supabase.from("prayer_times").upsert(
          {
            mosque_id: mosque.id,
            prayer_date: dateStr,
            fajr: toTimeString(times.fajr),
            sunrise: toTimeString(times.sunrise),
            dhuhr: toTimeString(times.dhuhr),
            asr: toTimeString(times.asr),
            maghrib: toTimeString(times.maghrib),
            isha: toTimeString(times.isha),
            is_manual_override: false,
            source: "calculated",
          },
          { onConflict: "mosque_id,prayer_date" }
        );
        datesWritten++;
      } catch (e) {
        errors.push(`${dateStr}: ${e instanceof Error ? e.message : "unknown error"}`);
      }
    }

    results.push({ mosqueId: mosque.id, datesWritten, errors });
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), mosqueCount: mosques.length, results });
}
