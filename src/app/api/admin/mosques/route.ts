import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const ctx = await getAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  let query = supabase.from("mosques").select("id, name, city_id, is_active").order("name");

  if (!ctx.isPlatformAdmin) {
    query = query.in("id", ctx.mosqueIds);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to load mosques" }, { status: 500 });
  }

  return NextResponse.json({ mosques: data, isPlatformAdmin: ctx.isPlatformAdmin });
}
