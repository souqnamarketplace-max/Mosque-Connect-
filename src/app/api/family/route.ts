import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/userAuth";

const createSchema = z.object({
  name: z.string().max(100).optional(),
  displayName: z.string().min(1).max(100),
});

const removeMemberSchema = z.object({ memberId: z.string().uuid() });

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session. Call /api/auth/ensure-session first." }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: membership } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ family: null, members: [] });
  }

  const { data: family } = await supabase
    .from("families")
    .select("id, name, created_at")
    .eq("id", membership.family_id)
    .single();

  const { data: members } = await supabase
    .from("family_members")
    .select("id, user_id, display_name, relationship, is_account_owner, joined_at")
    .eq("family_id", membership.family_id)
    .order("joined_at", { ascending: true });

  return NextResponse.json({ family, members: members ?? [] });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session. Call /api/auth/ensure-session first." }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Display name is required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // A user can only belong to one family at a time in this version.
  const { data: existing } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "You already belong to a family" }, { status: 409 });
  }

  const { data: family, error: familyError } = await supabase
    .from("families")
    .insert({ name: parsed.data.name || null, created_by: userId })
    .select()
    .single();

  if (familyError || !family) {
    return NextResponse.json({ error: "Failed to create family" }, { status: 500 });
  }

  const { error: memberError } = await supabase.from("family_members").insert({
    family_id: family.id,
    user_id: userId,
    display_name: parsed.data.displayName,
    is_account_owner: true,
  });

  if (memberError) {
    return NextResponse.json({ error: "Failed to add you as the first member" }, { status: 500 });
  }

  return NextResponse.json({ family });
}

export async function DELETE(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session." }, { status: 401 });
  }

  const parsed = removeMemberSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "memberId is required" }, { status: 400 });

  // RLS (family_members_owner_write) enforces that only the account owner
  // can remove other members; this also lets a non-owner remove themself.
  const supabase = await createServerSupabaseClient();
  const { data: target } = await supabase
    .from("family_members")
    .select("id, user_id, family_id")
    .eq("id", parsed.data.memberId)
    .single();

  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  if (target.user_id !== userId) {
    // Removing someone else — must be the owner; RLS will reject if not.
    const { error } = await supabase.from("family_members").delete().eq("id", parsed.data.memberId);
    if (error) return NextResponse.json({ error: "Only the family owner can remove other members" }, { status: 403 });
  } else {
    const { error } = await supabase.from("family_members").delete().eq("id", parsed.data.memberId);
    if (error) return NextResponse.json({ error: "Failed to leave family" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
