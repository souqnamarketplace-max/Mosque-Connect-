import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const querySchema = z.object({ province_id: z.string().uuid() });

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ province_id: searchParams.get("province_id") });
  if (!parsed.success) {
    return NextResponse.json({ error: "province_id must be a valid UUID" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("cities")
    .select("id, name, name_ar, name_ur, latitude, longitude, timezone")
    .eq("province_id", parsed.data.province_id)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load cities" }, { status: 500 });
  }
  return NextResponse.json(data);
}
