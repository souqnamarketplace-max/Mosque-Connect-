import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const querySchema = z.object({ mosque_id: z.string().uuid() });

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ mosque_id: searchParams.get("mosque_id") });
  if (!parsed.success) {
    return NextResponse.json({ error: "mosque_id must be a valid UUID" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("emergency_notifications")
    .select("id, title, message, created_at, expires_at")
    .eq("mosque_id", parsed.data.mosque_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
  return NextResponse.json(data);
}
