import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const querySchema = z.object({
  city_id: z.string().uuid(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

/** Haversine distance in km between two coordinates. */
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    city_id: searchParams.get("city_id"),
    lat: searchParams.get("lat") ?? undefined,
    lng: searchParams.get("lng") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "city_id must be a valid UUID" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("mosques")
    .select("id, name, logo_url, address, latitude, longitude")
    .eq("city_id", parsed.data.city_id)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load mosques" }, { status: 500 });
  }

  const { lat, lng } = parsed.data;
  const withDistance = data.map((mosque) => ({
    ...mosque,
    distanceKm:
      lat != null && lng != null && mosque.latitude != null && mosque.longitude != null
        ? Math.round(distanceKm(lat, lng, Number(mosque.latitude), Number(mosque.longitude)) * 10) / 10
        : null,
  }));

  if (lat != null && lng != null) {
    withDistance.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }

  return NextResponse.json(withDistance);
}
