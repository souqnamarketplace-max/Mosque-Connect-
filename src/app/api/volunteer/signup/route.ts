import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/userAuth";

const signupSchema = z.object({
  shiftId: z.string().uuid(),
  volunteerName: z.string().min(1).max(150),
  contactPhone: z.string().max(30).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
});

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json([]);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("volunteer_signups")
    .select("id, shift_id, status, created_at, volunteer_shifts(shift_date, start_time, end_time, volunteer_opportunities(title))")
    .eq("user_id", userId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to load signups" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session. Call /api/auth/ensure-session first." }, { status: 401 });
  }

  const parsed = signupSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("volunteer_signups")
    .insert({
      shift_id: parsed.data.shiftId,
      user_id: userId,
      volunteer_name: parsed.data.volunteerName,
      contact_phone: parsed.data.contactPhone || null,
      contact_email: parsed.data.contactEmail || null,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "You're already signed up for this shift" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to sign up" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "No session." }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("volunteer_signups")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: "Failed to cancel signup" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
