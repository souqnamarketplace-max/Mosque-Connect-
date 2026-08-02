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
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  expiresAt: z.string().datetime().optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mosqueId = searchParams.get("mosque_id");
  if (!mosqueId || !canManageMosque(ctx, mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pagination = parsePagination(searchParams);
  const [from, to] = rangeFor(pagination);

  const supabase = await createServerSupabaseClient();
  const { data, error, count } = await supabase
    .from("emergency_notifications")
    .select("*", { count: "exact" })
    .eq("mosque_id", mosqueId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return NextResponse.json({ error: "Failed to load emergency notifications" }, { status: 500 });
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
    .from("emergency_notifications")
    .insert({
      mosque_id: parsed.data.mosqueId,
      title: parsed.data.title,
      message: parsed.data.message,
      expires_at: parsed.data.expiresAt || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create emergency notification" }, { status: 500 });

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId: parsed.data.mosqueId,
    action: "emergency_notification.create",
    resourceType: "emergency_notification",
    resourceId: data.id,
    details: { title: data.title },
  });

  // Emergency push bypasses quiet hours and per-category opt-outs (see
  // sendSmartNotification) — this is the one category that's never
  // silently suppressed, by design.
  const serviceClient = createServiceRoleClient();
  const { data: subscribers } = await serviceClient
    .from("user_mosque_subscriptions")
    .select("user_id")
    .eq("mosque_id", parsed.data.mosqueId);

  for (const sub of subscribers ?? []) {
    sendSmartNotification({
      userId: sub.user_id,
      mosqueId: parsed.data.mosqueId,
      category: "emergency",
      title: data.title,
      body: data.message,
      url: "/",
    }).catch(() => {});
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const schema = z.object({ id: z.string().uuid(), isActive: z.boolean() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("emergency_notifications")
    .select("mosque_id")
    .eq("id", parsed.data.id)
    .single();
  if (!existing || !canManageMosque(ctx, existing.mosque_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("emergency_notifications")
    .update({ is_active: parsed.data.isActive })
    .eq("id", parsed.data.id);

  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId: existing.mosque_id,
    action: "emergency_notification.toggle_active",
    resourceType: "emergency_notification",
    resourceId: parsed.data.id,
    details: { isActive: parsed.data.isActive },
  });

  return NextResponse.json({ ok: true });
}
