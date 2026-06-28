import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/adminAudit";
import { parsePagination, rangeFor, buildPaginatedResponse } from "@/lib/pagination";
import { checkRateLimit } from "@/lib/rateLimit";

const createSchema = z.object({
  email: z.string().email(),
  mosqueIds: z.array(z.string().uuid()).min(1, "Select at least one mosque"),
  role: z.enum(["owner", "admin", "editor"]).default("admin"),
});

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx?.isPlatformAdmin) {
    return NextResponse.json({ error: "Only platform admins can view invites" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // "pending" | "accepted" | "revoked" | "expired"
  const pagination = parsePagination(searchParams);
  const [from, to] = rangeFor(pagination);

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("mosque_admin_invites")
    .select("id, email, mosque_ids, role, status, created_at, expires_at, accepted_at", { count: "exact" });
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);

  if (error) return NextResponse.json({ error: "Failed to load invites" }, { status: 500 });
  return NextResponse.json(buildPaginatedResponse(data ?? [], count ?? 0, pagination));
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx?.isPlatformAdmin) {
    return NextResponse.json({ error: "Only platform admins can create invites" }, { status: 403 });
  }

  const rateLimit = await checkRateLimit("mosqueAdminInviteCreate", request, ctx.userId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many invites created. Please wait a few minutes before trying again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.reset - Date.now()) / 1000)) } }
    );
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Verify every mosque ID actually exists, so a typo doesn't silently create
  // a dangling invite that can never be fulfilled.
  const { data: validMosques } = await supabase
    .from("mosques")
    .select("id")
    .in("id", parsed.data.mosqueIds);

  if (!validMosques || validMosques.length !== parsed.data.mosqueIds.length) {
    return NextResponse.json({ error: "One or more mosque IDs are invalid" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("mosque_admin_invites")
    .insert({
      email: parsed.data.email.toLowerCase().trim(),
      mosque_ids: parsed.data.mosqueIds,
      role: parsed.data.role,
      invited_by: ctx.userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });

  for (const mosqueId of parsed.data.mosqueIds) {
    await logAdminAction({
      actorUserId: ctx.userId,
      mosqueId,
      action: "mosque_admin_invite.create",
      resourceType: "mosque_admin_invite",
      resourceId: data.id,
      details: { email: parsed.data.email, role: parsed.data.role },
    });
  }

  // Build the acceptance link. Email delivery is a placeholder for now —
  // the link is returned here so the platform admin can copy/share it
  // manually until an email-sending integration is wired up at the end.
  const acceptUrl = `/admin/accept-invite?token=${data.token}`;

  return NextResponse.json({ ...data, acceptUrl });
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx?.isPlatformAdmin) {
    return NextResponse.json({ error: "Only platform admins can revoke invites" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("mosque_admin_invites")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: "Failed to revoke invite" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
