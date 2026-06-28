import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, canManageMosque } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/adminAudit";
import { parsePagination, rangeFor, buildPaginatedResponse } from "@/lib/pagination";

const createSchema = z.object({
  mosqueId: z.string().uuid(),
  title: z.string().min(1).max(150),
  description: z.string().max(1000).optional(),
  category: z.enum(["event_support", "food_service", "cleaning", "administration", "teaching", "fundraising", "general"]),
  coordinatorName: z.string().max(150).optional(),
  coordinatorContact: z.string().max(200).optional(),
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
  let oppQuery = supabase.from("volunteer_opportunities").select("*", { count: "exact" }).eq("mosque_id", mosqueId);
  if (category) oppQuery = oppQuery.eq("category", category);

  const { data: opportunities, error, count } = await oppQuery.order("created_at", { ascending: false }).range(from, to);

  if (error) return NextResponse.json({ error: "Failed to load opportunities" }, { status: 500 });

  const oppIds = (opportunities ?? []).map((o) => o.id);
  let shiftsByOpp: Record<string, unknown[]> = {};
  if (oppIds.length > 0) {
    const { data: shifts } = await supabase
      .from("volunteer_shifts")
      .select("id, opportunity_id, shift_date, start_time, end_time, capacity")
      .in("opportunity_id", oppIds)
      .order("shift_date", { ascending: true });
    shiftsByOpp = (shifts ?? []).reduce((acc, s) => {
      (acc[s.opportunity_id] ??= []).push(s);
      return acc;
    }, {} as Record<string, unknown[]>);
  }

  const enriched = (opportunities ?? []).map((o) => ({ ...o, shifts: shiftsByOpp[o.id] ?? [] }));
  return NextResponse.json(buildPaginatedResponse(enriched, count ?? 0, pagination));
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  if (!canManageMosque(ctx, parsed.data.mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("volunteer_opportunities")
    .insert({
      mosque_id: parsed.data.mosqueId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category,
      coordinator_name: parsed.data.coordinatorName || null,
      coordinator_contact: parsed.data.coordinatorContact || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId: parsed.data.mosqueId,
    action: "volunteer_opportunity.create",
    resourceType: "volunteer_opportunity",
    resourceId: data.id,
    details: { title: data.title },
  });

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase.from("volunteer_opportunities").select("mosque_id").eq("id", id).single();
  if (!existing || !canManageMosque(ctx, existing.mosque_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("volunteer_opportunities").update({ is_active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to remove opportunity" }, { status: 500 });

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId: existing.mosque_id,
    action: "volunteer_opportunity.deactivate",
    resourceType: "volunteer_opportunity",
    resourceId: id,
  });

  return NextResponse.json({ ok: true });
}
