import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canManageMosque } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mosqueId = searchParams.get("mosque_id");
  if (!mosqueId || !canManageMosque(ctx, mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    followersResult,
    followerUserIdsResult,
    notificationLogResult,
    eventsResult,
    announcementsResult,
    classRegResult,
    volunteerSignupResult,
    donationsResult,
    lostFoundResult,
    businessDirectoryResult,
  ] = await Promise.all([
    supabase.from("user_mosque_subscriptions").select("user_id", { count: "exact", head: true }).eq("mosque_id", mosqueId),

    // Need the actual follower user_ids (not just a count) to cross-reference
    // against push_subscriptions in a separate query below — there's no real
    // foreign key between these two tables (both independently reference
    // auth.users), so PostgREST can't do this as a single embedded join.
    supabase.from("user_mosque_subscriptions").select("user_id").eq("mosque_id", mosqueId),

    supabase
      .from("notification_delivery_log")
      .select("status")
      .eq("mosque_id", mosqueId)
      .gte("created_at", thirtyDaysAgo),

    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("mosque_id", mosqueId)
      .gte("event_date", new Date().toISOString().substring(0, 10)),

    supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("mosque_id", mosqueId)
      .gte("created_at", thirtyDaysAgo),

    supabase
      .from("class_registrations")
      .select("status, islamic_classes!inner(mosque_id)")
      .eq("islamic_classes.mosque_id", mosqueId)
      .neq("status", "cancelled"),

    supabase
      .from("volunteer_signups")
      .select("status, volunteer_shifts!inner(opportunity_id, volunteer_opportunities!inner(mosque_id))")
      .eq("volunteer_shifts.volunteer_opportunities.mosque_id", mosqueId)
      .neq("status", "cancelled"),

    supabase
      .from("donations")
      .select("amount")
      .eq("mosque_id", mosqueId)
      .eq("status", "succeeded")
      .gte("created_at", thirtyDaysAgo),

    supabase.from("lost_found_posts").select("status").eq("mosque_id", mosqueId),

    supabase
      .from("business_directory")
      .select("id", { count: "exact", head: true })
      .eq("mosque_id", mosqueId)
      .eq("status", "pending"),
  ]);

  // Resolve push-subscriber count via a second, explicit query against the
  // follower user_ids gathered above, rather than a same-call embedded join
  // that PostgREST has no foreign key to support.
  const followerUserIds = (followerUserIdsResult.data ?? []).map((r) => r.user_id);
  let pushSubscriberCount = 0;
  if (followerUserIds.length > 0) {
    const { data: subRows } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .in("user_id", followerUserIds);
    pushSubscriberCount = new Set((subRows ?? []).map((r) => r.user_id)).size;
  }

  const notificationStatusCounts = (notificationLogResult.data ?? []).reduce((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const classRegistered = (classRegResult.data ?? []).filter((r) => r.status === "registered").length;
  const classWaitlisted = (classRegResult.data ?? []).filter((r) => r.status === "waitlisted").length;

  const volunteerConfirmed = (volunteerSignupResult.data ?? []).filter((r) => r.status === "confirmed").length;
  const volunteerWaitlisted = (volunteerSignupResult.data ?? []).filter((r) => r.status === "waitlisted").length;

  const donationTotal = (donationsResult.data ?? []).reduce((sum, d) => sum + Number(d.amount), 0);

  const lostFoundOpen = (lostFoundResult.data ?? []).filter((p) => p.status === "open").length;
  const lostFoundResolved = (lostFoundResult.data ?? []).filter((p) => p.status === "resolved").length;

  return NextResponse.json({
    followers: followersResult.count ?? 0,
    pushSubscribers: pushSubscriberCount,
    notifications: {
      sent: notificationStatusCounts.sent ?? 0,
      failed: notificationStatusCounts.failed ?? 0,
      skippedQuietHours: notificationStatusCounts.skipped_quiet_hours ?? 0,
      skippedOptedOut: notificationStatusCounts.skipped_opted_out ?? 0,
    },
    upcomingEvents: eventsResult.count ?? 0,
    announcementsLast30Days: announcementsResult.count ?? 0,
    classes: { registered: classRegistered, waitlisted: classWaitlisted },
    volunteer: { confirmed: volunteerConfirmed, waitlisted: volunteerWaitlisted },
    donations: { totalLast30Days: donationTotal, currency: "CAD" },
    lostFound: { open: lostFoundOpen, resolved: lostFoundResolved },
    businessDirectoryPending: businessDirectoryResult.count ?? 0,
  });
}
