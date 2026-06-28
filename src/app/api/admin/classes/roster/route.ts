import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("class_id");
  if (!classId) return NextResponse.json({ error: "class_id is required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("class_registrations")
    .select("id, student_name, student_age, contact_phone, contact_email, status, created_at")
    .eq("class_id", classId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "Failed to load roster" }, { status: 500 });
  return NextResponse.json(data);
}
