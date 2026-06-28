import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWeatherCodeInfo } from "@/lib/weatherCodes";

export const revalidate = 1800; // 30 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mosqueId = searchParams.get("mosque_id");
  if (!mosqueId) {
    return NextResponse.json({ error: "mosque_id is required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: mosque } = await supabase
    .from("mosques")
    .select("latitude, longitude")
    .eq("id", mosqueId)
    .single();

  if (!mosque || mosque.latitude == null || mosque.longitude == null) {
    return NextResponse.json({ error: "Mosque location is not set" }, { status: 400 });
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${mosque.latitude}&longitude=${mosque.longitude}&current=temperature_2m,weather_code&temperature_unit=celsius`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`);

    const data = await res.json();
    const temperatureC = data.current?.temperature_2m;
    const weatherCode = data.current?.weather_code;

    if (typeof temperatureC !== "number" || typeof weatherCode !== "number") {
      throw new Error("Unexpected Open-Meteo response shape");
    }

    const { icon, labelKey } = getWeatherCodeInfo(weatherCode);

    return NextResponse.json({
      temperatureC: Math.round(temperatureC),
      icon,
      labelKey,
    });
  } catch (err) {
    console.error("Weather fetch failed:", err);
    return NextResponse.json({ error: "Weather unavailable" }, { status: 502 });
  }
}
