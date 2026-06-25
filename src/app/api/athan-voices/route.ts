import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("athan_voices")
    .select("id, name, audio_url, duration_seconds, is_default")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load voices" }, { status: 500 });
  }
  return NextResponse.json(data);
}
