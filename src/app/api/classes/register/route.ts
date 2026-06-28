import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/userAuth";

const registerSchema = z.object({
  classId: z.string().uuid(),
  studentName: z.string().min(1).max(150),
  studentAge: z.number().int().min(0).max(120).optional(),
  contactPhone: z.string().max(30).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
});

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json([]);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("class_registrations")
    .select("id, class_id, student_name, status, created_at, islamic_classes(title)")
    .eq("registered_by", userId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to load registrations" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session. Call /api/auth/ensure-session first." }, { status: 401 });
  }

  const parsed = registerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("class_registrations")
    .insert({
      class_id: parsed.data.classId,
      registered_by: userId,
      student_name: parsed.data.studentName,
      student_age: parsed.data.studentAge ?? null,
      contact_phone: parsed.data.contactPhone || null,
      contact_email: parsed.data.contactEmail || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to register" }, { status: 500 });

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "No session." }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("class_registrations")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("registered_by", userId);

  if (error) return NextResponse.json({ error: "Failed to cancel registration" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
