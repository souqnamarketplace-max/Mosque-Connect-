import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const lookupSchema = z.object({ token: z.string().min(1) });
const acceptSchema = z.object({ token: z.string().min(1), password: z.string().min(8) });

/** GET — look up an invite by token to show its details before the person commits. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = lookupSchema.safeParse({ token: searchParams.get("token") });
  if (!parsed.success) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: invite } = await supabase
    .from("mosque_admin_invites")
    .select("id, email, mosque_ids, role, status, expires_at")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.status !== "pending") {
    return NextResponse.json({ error: `This invite has already been ${invite.status}` }, { status: 410 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
  }

  const { data: mosques } = await supabase.from("mosques").select("id, name").in("id", invite.mosque_ids);

  return NextResponse.json({ email: invite.email, role: invite.role, mosques: mosques ?? [] });
}

/** POST — accept the invite: create (or sign into) the auth account, then
 * insert mosque_admins rows for every mosque in the invite, atomically
 * enough that a failure partway through doesn't silently leave the invite
 * marked accepted without the access actually being granted. */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: invite } = await supabase
    .from("mosque_admin_invites")
    .select("id, email, mosque_ids, role, status, expires_at")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.status !== "pending") {
    return NextResponse.json({ error: `This invite has already been ${invite.status}` }, { status: 410 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
  }

  // Create the account. If one already exists for this email, sign in instead
  // — this lets someone who already has an account accept a second invite
  // (e.g. being added to manage an additional mosque) without erroring.
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: invite.email,
    password: parsed.data.password,
  });

  let userId = signUpData.user?.id;

  if (signUpError) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: invite.email,
      password: parsed.data.password,
    });
    if (signInError || !signInData.user) {
      return NextResponse.json(
        { error: "An account with this email already exists. If it's yours, the password didn't match." },
        { status: 409 }
      );
    }
    userId = signInData.user.id;
  }

  if (!userId) {
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }

  const rows = invite.mosque_ids.map((mosqueId: string) => ({
    mosque_id: mosqueId,
    user_id: userId,
    role: invite.role,
  }));

  const { error: insertError } = await supabase.from("mosque_admins").upsert(rows, { onConflict: "mosque_id,user_id" });

  if (insertError) {
    return NextResponse.json({ error: "Account created, but failed to grant mosque access. Contact support." }, { status: 500 });
  }

  await supabase
    .from("mosque_admin_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true, mosqueCount: rows.length });
}
