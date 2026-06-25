import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * ONLY use this inside server-side API routes, and ONLY for the three
 * device-scoped tables that RLS cannot protect on its own:
 *   - athan_preferences
 *   - dua_reminder_preferences
 *   - dua_reminder_log
 *
 * Every call site using this client MUST manually verify that the
 * device_id in the request body/query matches the device_id the caller
 * is authorized for (see deviceAuth.ts) before reading or writing a row.
 * Never import this file into a Client Component or expose
 * SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
