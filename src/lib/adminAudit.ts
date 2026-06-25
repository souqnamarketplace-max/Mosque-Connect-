import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

interface AuditLogEntry {
  actorUserId: string;
  mosqueId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, unknown>;
}

/**
 * Records an admin action for accountability. Uses the service-role client
 * since this is a server-side-only write with no corresponding INSERT RLS
 * policy (by design — only API routes should ever write audit entries,
 * never the browser directly). Failures are swallowed rather than thrown:
 * a logging failure should never block the actual admin action it's
 * describing from completing.
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from("admin_audit_logs").insert({
      actor_user_id: entry.actorUserId,
      mosque_id: entry.mosqueId ?? null,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId ?? null,
      details: entry.details ?? {},
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
