import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

webpush.setVapidDetails(
  process.env.VAPID_CONTACT_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export type NotificationCategory =
  | "prayer_reminder"
  | "jumuah_reminder"
  | "new_announcement"
  | "new_event"
  | "emergency"
  | "dua_reminder";

interface SendOptions {
  userId: string;
  mosqueId?: string;
  category: NotificationCategory;
  title: string;
  body: string;
  url?: string;
}

/** True if the given UTC instant falls within the user's configured quiet
 * hours window, accounting for windows that cross midnight (e.g. 22:00-07:00). */
function isWithinQuietHours(now: Date, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

/**
 * The "smart" part of Smart Push Notifications: checks the user's quiet
 * hours and per-category opt-outs before sending, logs every decision
 * (sent / skipped / failed) for visibility, and never lets emergency
 * notifications be silently suppressed by quiet hours or opt-outs.
 */
export async function sendSmartNotification(options: SendOptions): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", options.userId)
    .maybeSingle();

  const isEmergency = options.category === "emergency";

  if (!isEmergency && prefs) {
    if (isWithinQuietHours(new Date(), prefs.quiet_hours_start, prefs.quiet_hours_end)) {
      await logDelivery(supabase, options, "skipped_quiet_hours");
      return;
    }
    if (options.category === "new_announcement" && prefs.notify_new_announcements === false) {
      await logDelivery(supabase, options, "skipped_opted_out");
      return;
    }
    if (options.category === "new_event" && prefs.notify_new_events === false) {
      await logDelivery(supabase, options, "skipped_opted_out");
      return;
    }
  }

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", options.userId)
    .eq("platform", "web_push");

  if (!subscriptions || subscriptions.length === 0) {
    await logDelivery(supabase, options, "skipped_opted_out");
    return;
  }

  let anySucceeded = false;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh!, auth: sub.auth_key! },
        },
        JSON.stringify({ title: options.title, body: options.body, url: options.url ?? "/" })
      );
      anySucceeded = true;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  await logDelivery(supabase, options, anySucceeded ? "sent" : "failed");
}

async function logDelivery(
  supabase: ReturnType<typeof createServiceRoleClient>,
  options: SendOptions,
  status: "sent" | "failed" | "skipped_quiet_hours" | "skipped_opted_out"
) {
  await supabase.from("notification_delivery_log").insert({
    user_id: options.userId,
    mosque_id: options.mosqueId ?? null,
    category: options.category,
    title: options.title,
    body: options.body,
    status,
    sent_at: status === "sent" ? new Date().toISOString() : null,
  });
}
