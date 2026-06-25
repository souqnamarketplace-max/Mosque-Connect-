import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Anon, RLS-respecting server client — use for all PUBLIC reads (mosques, prayer
// times, announcements, events, dua content, etc). Never use this for the three
// device-scoped tables (athan_preferences, dua_reminder_preferences,
// dua_reminder_log) — use createServiceRoleClient + manual device_id checks instead.
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
