import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Anon, RLS-respecting, session-aware server client. Used for all public
// reads (mosques, prayer times, announcements, events, dua content, etc.)
// AND for user-owned data (athan_preferences, dua_reminder_preferences,
// dua_reminder_log, family accounts, mosque admin actions) — RLS policies
// keyed on auth.uid() (including anonymous-auth users) do the ownership
// enforcement, so this client is safe for both cases. The service-role
// client (serviceRole.ts) is reserved for contexts with no user session at
// all, e.g. the nightly prayer-times cron job.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore if you have
            // middleware refreshing sessions.
          }
        },
      },
    }
  );
}
