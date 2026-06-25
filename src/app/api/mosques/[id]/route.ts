import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("mosques")
    .select("id, name, logo_url, address, timezone")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Mosque not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
