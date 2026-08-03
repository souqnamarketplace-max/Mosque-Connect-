import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { calculatePrayerTimes, toTimeString, addMinutesToTimeString } from "@/lib/prayerCalculation";

/**
 * Runs daily via Vercel Cron (see vercel.json). For every active mosque,
 * ensures prayer_times rows exist for today through +13 days (14-day rolling
 * window), so the app never 404s on "today" the way it did before this job
 * existed. Skips any date where is_manual_override = true, per spec 2.2.
 *
 * Also materializes iqama_times for the same window from whichever
 * mosque_standing_schedules row is active on each date (a mosque's
 * "effective from X until further notice" announced schedule), so admins
 * don't have to hand-enter iqama times one calendar day at a time. A
 * specific date an admin has manually edited (iqama_times.is_manual_override
 * = true) is never touched by this.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // Fail closed: if the secret was never configured, refuse every request
    // rather than silently comparing against the literal string "undefined"
    // (which an attacker could trivially send as the header value).
    console.error("CRON_SECRET is not set — refusing all requests to this endpoint.");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
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

  const results: Array<{ mosqueId: string; datesWritten: number; iqamaDatesWritten: number; errors: string[] }> = [];

  for (const mosque of mosques) {
    if (mosque.latitude == null || mosque.longitude == null) continue;

    const errors: string[] = [];
    let datesWritten = 0;
    let iqamaDatesWritten = 0;

    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + i);
      const dateStr = date.toISOString().substring(0, 10);

      // Skip dates an admin has manually overridden.
      const { data: existingPrayerRow } = await supabase
        .from("prayer_times")
        .select("is_manual_override, maghrib")
        .eq("mosque_id", mosque.id)
        .eq("prayer_date", dateStr)
        .maybeSingle();

      let maghribForIqama = existingPrayerRow?.maghrib ?? null;

      if (!existingPrayerRow?.is_manual_override) {
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
          maghribForIqama = toTimeString(times.maghrib);
        } catch (e) {
          errors.push(`${dateStr}: ${e instanceof Error ? e.message : "unknown error"}`);
        }
      }

      // ── Materialize iqama_times from the active standing schedule ──────
      try {
        const { data: existingIqamaRow } = await supabase
          .from("iqama_times")
          .select("is_manual_override")
          .eq("mosque_id", mosque.id)
          .eq("iqama_date", dateStr)
          .maybeSingle();

        if (existingIqamaRow?.is_manual_override) continue;

        const { data: schedule } = await supabase
          .from("mosque_standing_schedules")
          .select("*")
          .eq("mosque_id", mosque.id)
          .lte("effective_from", dateStr)
          .or(`effective_until.is.null,effective_until.gte.${dateStr}`)
          .order("effective_from", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!schedule) continue;

        const maghrib = schedule.maghrib_fixed
          ? schedule.maghrib_fixed
          : maghribForIqama
          ? addMinutesToTimeString(maghribForIqama, schedule.maghrib_offset_minutes ?? 0)
          : null;

        if (!maghrib) continue; // no sunset baseline available yet for this date

        const isFriday = new Date(`${dateStr}T12:00:00Z`).getUTCDay() === 5;

        await supabase.from("iqama_times").upsert(
          {
            mosque_id: mosque.id,
            iqama_date: dateStr,
            fajr: schedule.fajr,
            dhuhr: schedule.dhuhr,
            asr: schedule.asr,
            maghrib,
            isha: schedule.isha,
            is_jumuah: isFriday && !!schedule.jumuah_1_start,
            jumuah_khutbah_time: isFriday ? schedule.jumuah_1_start : null,
            jumuah_1_start: isFriday ? schedule.jumuah_1_start : null,
            jumuah_1_end: isFriday ? schedule.jumuah_1_end : null,
            jumuah_2_start: isFriday ? schedule.jumuah_2_start : null,
            jumuah_2_end: isFriday ? schedule.jumuah_2_end : null,
            notes: schedule.notes ?? null,
            is_manual_override: false,
            source: "standing_schedule",
          },
          { onConflict: "mosque_id,iqama_date" }
        );
        iqamaDatesWritten++;
      } catch (e) {
        errors.push(`iqama ${dateStr}: ${e instanceof Error ? e.message : "unknown error"}`);
      }
    }

    results.push({ mosqueId: mosque.id, datesWritten, iqamaDatesWritten, errors });
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), mosqueCount: mosques.length, results });
}
