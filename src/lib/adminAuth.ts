import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AdminContext {
  userId: string;
  isPlatformAdmin: boolean;
  mosqueIds: string[];
}

/**
 * Returns the admin context for the current request's authenticated user,
 * or null if not authenticated / not an admin anywhere. Use this at the top
 * of every /api/admin/* route before touching mosque-scoped data.
 */
export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const { data: mosqueAdminRows } = await supabase
    .from("mosque_admins")
    .select("mosque_id")
    .eq("user_id", userData.user.id);

  const mosqueIds = (mosqueAdminRows ?? []).map((r) => r.mosque_id);
  const isPlatformAdmin = !!platformAdmin;

  if (!isPlatformAdmin && mosqueIds.length === 0) return null;

  return { userId: userData.user.id, isPlatformAdmin, mosqueIds };
}

/** Throws-free check: does this admin context permit acting on the given mosque? */
export function canManageMosque(ctx: AdminContext, mosqueId: string): boolean {
  return ctx.isPlatformAdmin || ctx.mosqueIds.includes(mosqueId);
}
