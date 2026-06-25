import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Returns the authenticated user's ID (real auth.uid(), backed by Supabase
 * Anonymous Auth — no email/password required from the person). This
 * replaces the earlier device_id cookie approach for athan_preferences,
 * dua_reminder_preferences, and dua_reminder_log, closing the RLS gap that
 * existed because device_id was a client-supplied UUID with no real
 * verification at the database layer.
 *
 * Returns null if there is no session yet — callers should prompt the
 * client to call /api/auth/ensure-session first (which performs
 * supabase.auth.signInAnonymously() and sets the session cookie).
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
