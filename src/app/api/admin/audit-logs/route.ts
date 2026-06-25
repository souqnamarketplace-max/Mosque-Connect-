import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canManageMosque } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mosqueId = searchParams.get("mosque_id");
  if (!mosqueId || !canManageMosque(ctx, mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("id, actor_user_id, action, resource_type, resource_id, details, created_at")
    .eq("mosque_id", mosqueId)
    .order("created_at", { ascending: false })
    .limit(100);

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

  return NextResponse.json(enriched);
}
