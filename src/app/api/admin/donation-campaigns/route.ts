import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, canManageMosque } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/adminAudit";

const createSchema = z.object({
  mosqueId: z.string().uuid(),
  category: z.enum(["general", "mosque_operations", "ramadan_campaign", "building_fund", "community_support"]),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  goalAmount: z.number().positive().optional(),
});

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mosqueId = searchParams.get("mosque_id");
  if (!mosqueId || !canManageMosque(ctx, mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("donation_campaigns")
    .select("*")
    .eq("mosque_id", mosqueId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: "Failed to load campaigns" }, { status: 500 });
  return NextResponse.json(data);
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
    .from("donation_campaigns")
    .insert({
      mosque_id: parsed.data.mosqueId,
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description || null,
      goal_amount: parsed.data.goalAmount ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId: parsed.data.mosqueId,
    action: "donation_campaign.create",
    resourceType: "donation_campaign",
    resourceId: data.id,
    details: { title: data.title, goalAmount: data.goal_amount },
  });
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
    .from("donation_campaigns")
    .select("mosque_id")
    .eq("id", parsed.data.id)
    .single();
  if (!existing || !canManageMosque(ctx, existing.mosque_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("donation_campaigns")
    .update({ is_active: parsed.data.isActive })
    .eq("id", parsed.data.id);

  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId: existing.mosque_id,
    action: "donation_campaign.toggle_active",
    resourceType: "donation_campaign",
    resourceId: parsed.data.id,
    details: { isActive: parsed.data.isActive },
  });

  return NextResponse.json({ ok: true });
}
