import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, canManageMosque } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { sendSmartNotification } from "@/lib/push/sendSmartNotification";
import { logAdminAction } from "@/lib/adminAudit";
import { parsePagination, rangeFor, buildPaginatedResponse } from "@/lib/pagination";

const createSchema = z.object({
  mosqueId: z.string().uuid(),
  category: z.enum(["general", "prayer_changes", "emergency", "community_news", "ramadan", "eid", "funeral", "nikah"]),
  title: z.string().min(1).max(200),
  body: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  pdfUrl: z.string().url().optional().or(z.literal("")),
  linkUrl: z.string().url().optional().or(z.literal("")),
  isPinned: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().or(z.literal("")),
  deceasedName: z.string().max(200).optional(),
  burialTime: z.string().datetime().optional().or(z.literal("")),
  burialLocation: z.string().max(300).optional(),
  coupleNames: z.string().max(200).optional(),
  ceremonyTime: z.string().datetime().optional().or(z.literal("")),
  ceremonyLocation: z.string().max(300).optional(),
});

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mosqueId = searchParams.get("mosque_id");
  if (!mosqueId || !canManageMosque(ctx, mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const category = searchParams.get("category");
  const pagination = parsePagination(searchParams);
  const [from, to] = rangeFor(pagination);

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("announcements")
    .select("*", { count: "exact" })
    .eq("mosque_id", mosqueId);

  if (category) query = query.eq("category", category);

  const { data, error, count } = await query.order("publish_at", { ascending: false }).range(from, to);

  if (error) return NextResponse.json({ error: "Failed to load announcements" }, { status: 500 });
  return NextResponse.json(buildPaginatedResponse(data ?? [], count ?? 0, pagination));
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  if (!canManageMosque(ctx, parsed.data.mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      mosque_id: parsed.data.mosqueId,
      category: parsed.data.category,
      title: parsed.data.title,
      body: parsed.data.body || null,
      image_url: parsed.data.imageUrl || null,
      pdf_url: parsed.data.pdfUrl || null,
      link_url: parsed.data.linkUrl || null,
      is_pinned: parsed.data.isPinned ?? false,
      expires_at: parsed.data.expiresAt || null,
      created_by: ctx.userId,
      deceased_name: parsed.data.deceasedName || null,
      burial_time: parsed.data.burialTime || null,
      burial_location: parsed.data.burialLocation || null,
      couple_names: parsed.data.coupleNames || null,
      ceremony_time: parsed.data.ceremonyTime || null,
      ceremony_location: parsed.data.ceremonyLocation || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId: parsed.data.mosqueId,
    action: "announcement.create",
    resourceType: "announcement",
    resourceId: data.id,
    details: { title: data.title, category: data.category },
  });

  // Fan out a smart notification to everyone following this mosque, unless
  // this announcement isn't published yet (future publish_at) or is an
  // emergency (handled by a higher-priority path elsewhere, to avoid
  // double-sending once that path exists).
  if (parsed.data.category !== "emergency") {
    const serviceClient = createServiceRoleClient();
    const { data: subscribers } = await serviceClient
      .from("user_mosque_subscriptions")
      .select("user_id")
      .eq("mosque_id", parsed.data.mosqueId);

    const category = parsed.data.category === "funeral" ? "emergency" : "new_announcement";
    for (const sub of subscribers ?? []) {
      // Intentionally not awaited in sequence to avoid blocking the admin's
      // response on potentially dozens/hundreds of push sends; each send
      // independently logs its own outcome to notification_delivery_log.
      sendSmartNotification({
        userId: sub.user_id,
        mosqueId: parsed.data.mosqueId,
        category,
        title: data.title,
        body: data.body ?? "",
        url: "/announcements",
      }).catch(() => {});
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase.from("announcements").select("mosque_id").eq("id", id).single();
  if (!existing || !canManageMosque(ctx, existing.mosque_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId: existing.mosque_id,
    action: "announcement.delete",
    resourceType: "announcement",
    resourceId: id,
  });

  return NextResponse.json({ ok: true });
}
