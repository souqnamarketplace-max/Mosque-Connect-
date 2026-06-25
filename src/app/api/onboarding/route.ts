import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setLanguage, setMosqueId, setTheme } from "@/lib/onboardingState";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/userAuth";

const bodySchema = z.object({
  language: z.enum(["en", "ar", "ur"]).optional(),
  mosqueId: z.string().uuid().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.language) await setLanguage(parsed.data.language);
  if (parsed.data.theme) await setTheme(parsed.data.theme);

  if (parsed.data.mosqueId) {
    await setMosqueId(parsed.data.mosqueId);

    // Also persist as a real row tied to the authenticated user (not just
    // a cookie), so server-side processes — push notification fan-out,
    // future analytics — can actually see which mosque this person follows.
    // Best-effort: if there's no session yet, the cookie alone still lets
    // the Home Screen work; this just means notifications can't reach them
    // until a session exists (created automatically on next page load).
    const userId = await getAuthenticatedUserId();
    if (userId) {
      const supabase = await createServerSupabaseClient();
      await supabase
        .from("user_mosque_subscriptions")
        .upsert(
          { user_id: userId, mosque_id: parsed.data.mosqueId, is_primary: true },
          { onConflict: "user_id,mosque_id" }
        );
    }
  }

  return NextResponse.json({ ok: true });
}
