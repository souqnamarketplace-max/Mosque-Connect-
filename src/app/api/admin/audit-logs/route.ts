import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canManageMosque } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { parsePagination, rangeFor, buildPaginatedResponse } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mosqueId = searchParams.get("mosque_id");
  if (!mosqueId || !canManageMosque(ctx, mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const action = searchParams.get("action"); // e.g. "announcement.create"
  const dateFrom = searchParams.get("date_from"); // ISO date, e.g. 2026-06-01
  const dateTo = searchParams.get("date_to");

  const pagination = parsePagination(searchParams);
  const [from, to] = rangeFor(pagination);

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("admin_audit_logs")
    .select("id, actor_user_id, action, resource_type, resource_id, details, created_at", { count: "exact" })
    .eq("mosque_id", mosqueId);

  if (action) query = query.eq("action", action);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);

  if (error) return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 });

  // Resolve actor emails. admin_audit_logs only stores user_id; auth.users
  // isn't exposed through the regular RLS-respecting client, so the
  // service-role client is used here for this one lookup — read-only,
  // and only for the small set of distinct actor IDs already filtered to
  // this mosque's own audit trail (an admin the caller is already
  // authorized to view).
  const actorIds = [...new Set((data ?? []).map((row) => row.actor_user_id).filter(Boolean))] as string[];
  const emailById: Record<string, string> = {};

  if (actorIds.length > 0) {
    const serviceClient = createServiceRoleClient();
    for (const id of actorIds) {
      const { data: userData } = await serviceClient.auth.admin.getUserById(id);
      if (userData?.user?.email) emailById[id] = userData.user.email;
    }
  }

  const enriched = (data ?? []).map((row) => ({
    ...row,
    actor_email: row.actor_user_id ? emailById[row.actor_user_id] ?? "Unknown" : "System",
  }));

  return NextResponse.json(buildPaginatedResponse(enriched, count ?? 0, pagination));
}
