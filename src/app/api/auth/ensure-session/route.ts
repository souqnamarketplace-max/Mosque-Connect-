import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Called once on app load. If the browser already has a valid Supabase
 * session (anonymous or otherwise), this is a no-op. If not, it creates a
 * new anonymous user via signInAnonymously() — invisible to the person,
 * no email/password — and the resulting session cookie is what makes
 * getAuthenticatedUserId() work in every subsequent request.
 */
export async function POST() {
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase.auth.getUser();
  if (existing.user) {
    return NextResponse.json({ userId: existing.user.id, created: false });
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    return NextResponse.json(
      { error: "Failed to start session. Anonymous sign-ins may not be enabled for this project." },
      { status: 500 }
    );
  }

  return NextResponse.json({ userId: data.user.id, created: true });
}
