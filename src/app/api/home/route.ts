import { NextResponse } from "next/server";
import { getOnboardingState } from "@/lib/onboardingState";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServerDict } from "@/lib/i18n/getServerDict";
import { gregorianToHijri, formatHijriDate } from "@/lib/hijriDate";
import { getWeatherCodeInfo } from "@/lib/weatherCodes";

export const revalidate = 0;

export async function GET() {
  const { mosqueId } = await getOnboardingState();
  const { language, dict } = await getServerDict();

  const hijriDate = formatHijriDate(gregorianToHijri(new Date()), language);

  if (!mosqueId) {
    return NextResponse.json({ mosqueId: null, mosqueName: null, city: null, hijriDate });
  }

  const supabase = await createServerSupabaseClient();

  const { data: mosque } = await supabase
    .from("mosques")
    .select("name, latitude, longitude, city_id")
    .eq("id", mosqueId)
    .single();

  let city: string | null = null;
  if (mosque?.city_id) {
    const { data: cityRow } = await supabase
      .from("cities")
      .select("name, name_ar, name_ur")
      .eq("id", mosque.city_id)
      .single();
    if (cityRow) {
      city = language === "ar" ? cityRow.name_ar || cityRow.name : language === "ur" ? cityRow.name_ur || cityRow.name : cityRow.name;
    }
  }

  let weather: { temp: number; condition: string } | undefined;
  if (mosque?.latitude != null && mosque?.longitude != null) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${mosque.latitude}&longitude=${mosque.longitude}&current=temperature_2m,weather_code&temperature_unit=celsius`;
      const res = await fetch(url, { next: { revalidate: 1800 } });
      if (res.ok) {
        const data = await res.json();
        const temperatureC = data.current?.temperature_2m;
        const weatherCode = data.current?.weather_code;
        if (typeof temperatureC === "number" && typeof weatherCode === "number") {
          const { labelKey } = getWeatherCodeInfo(weatherCode);
          weather = {
            temp: Math.round(temperatureC),
            condition: dict.home.weather.conditions[labelKey as keyof typeof dict.home.weather.conditions] ?? labelKey,
          };
        }
      }
    } catch {
      // Weather is a nice-to-have on the home screen — a failed fetch
      // just means the hero card omits it, not a broken page.
    }
  }

  const nowIso = new Date().toISOString();
  const { data: announcementRows } = await supabase
    .from("announcements")
    .select("title, title_ar, title_ur, body, body_ar, body_ur, link_url")
    .eq("mosque_id", mosqueId)
    .lte("publish_at", nowIso)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("is_pinned", { ascending: false })
    .order("publish_at", { ascending: false })
    .limit(1);

  const row = announcementRows?.[0];
  const announcement = row
    ? {
        title: language === "ar" ? row.title_ar || row.title : language === "ur" ? row.title_ur || row.title : row.title,
        body: language === "ar" ? row.body_ar || row.body : language === "ur" ? row.body_ur || row.body : row.body,
        url: row.link_url ?? undefined,
      }
    : undefined;

  return NextResponse.json({
    mosqueId,
    mosqueName: mosque?.name ?? null,
    city,
    hijriDate,
    weather,
    announcement,
  });
}
