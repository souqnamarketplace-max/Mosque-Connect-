import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("provinces")
    .select("id, code, name, name_ar, name_ur")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load provinces" }, { status: 500 });
  }
  return NextResponse.json(data);
}
