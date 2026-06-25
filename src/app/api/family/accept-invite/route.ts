import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/userAuth";

const lookupSchema = z.object({ token: z.string().min(1) });
const acceptSchema = z.object({ token: z.string().min(1), displayName: z.string().min(1).max(100) });

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = lookupSchema.safeParse({ token: searchParams.get("token") });
  if (!parsed.success) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: invite } = await supabase
    .from("family_invites")
    .select("id, family_id, status, expires_at")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.status !== "pending") {
    return NextResponse.json({ error: `This invite has already been ${invite.status}` }, { status: 410 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
  }

  const { data: family } = await supabase.from("families").select("name").eq("id", invite.family_id).single();
  return NextResponse.json({ familyName: family?.name ?? null });
}

export async function POST(request: NextRequest) {
  const parsed = acceptSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Display name is required" }, { status: 400 });
  }

  // Ensure the joining person has a real session — anonymous is fine.
  let userId = await getAuthenticatedUserId();
  const supabase = await createServerSupabaseClient();
  if (!userId) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      return NextResponse.json({ error: "Failed to start a session" }, { status: 500 });
    }
    userId = data.user.id;
  }

  const { data: invite } = await supabase
    .from("family_invites")
    .select("id, family_id, status, expires_at")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.status !== "pending") {
    return NextResponse.json({ error: `This invite has already been ${invite.status}` }, { status: 410 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
  }

  // If this user already belongs to a different family, joining a new one
  // isn't allowed in this version (one family per user) — surfaced clearly
  // rather than silently failing or double-joining.
  const { data: existingMembership } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingMembership && existingMembership.family_id !== invite.family_id) {
    return NextResponse.json({ error: "You already belong to a different family" }, { status: 409 });
  }
  if (existingMembership) {
    return NextResponse.json({ ok: true, alreadyMember: true });
  }

  const { error: insertError } = await supabase.from("family_members").insert({
    family_id: invite.family_id,
    user_id: userId,
    display_name: parsed.data.displayName,
    is_account_owner: false,
  });

  if (insertError) {
    return NextResponse.json({ error: "Failed to join family" }, { status: 500 });
  }

  await supabase
    .from("family_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true });
}
