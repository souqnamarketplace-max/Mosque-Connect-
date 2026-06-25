import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/userAuth";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable();

const patchSchema = z.object({
  quietHoursStart: timeSchema.optional(),
  quietHoursEnd: timeSchema.optional(),
  notifyNewAnnouncements: z.boolean().optional(),
  notifyNewEvents: z.boolean().optional(),
});

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session." }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return NextResponse.json(
    data ?? {
      quiet_hours_start: "22:00",
      quiet_hours_end: "07:00",
      notify_new_announcements: true,
      notify_new_events: true,
      notify_emergency: true,
    }
  );
}

export async function PATCH(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session." }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: userId,
        quiet_hours_start: parsed.data.quietHoursStart,
        quiet_hours_end: parsed.data.quietHoursEnd,
        notify_new_announcements: parsed.data.notifyNewAnnouncements,
        notify_new_events: parsed.data.notifyNewEvents,
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }
  return NextResponse.json(data);
}
