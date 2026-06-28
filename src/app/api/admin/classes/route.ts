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
  instructorName: z.string().max(150).optional(),
  ageGroup: z.enum(["children", "youth", "adults", "all_ages"]),
  scheduleNote: z.string().max(300).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  capacity: z.number().int().positive().optional(),
  location: z.string().max(200).optional(),
});

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const mosqueId = searchParams.get("mosque_id");
  if (!mosqueId || !canManageMosque(ctx, mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ageGroup = searchParams.get("age_group");
  const pagination = parsePagination(searchParams);
  const [from, to] = rangeFor(pagination);

  const supabase = await createServerSupabaseClient();
  let query = supabase.from("islamic_classes").select("*", { count: "exact" }).eq("mosque_id", mosqueId);
  if (ageGroup) query = query.eq("age_group", ageGroup);

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);

  if (error) return NextResponse.json({ error: "Failed to load classes" }, { status: 500 });
  return NextResponse.json(buildPaginatedResponse(data ?? [], count ?? 0, pagination));
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
    .from("islamic_classes")
    .insert({
      mosque_id: parsed.data.mosqueId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      instructor_name: parsed.data.instructorName || null,
      age_group: parsed.data.ageGroup,
      schedule_note: parsed.data.scheduleNote || null,
      start_date: parsed.data.startDate || null,
      end_date: parsed.data.endDate || null,
      capacity: parsed.data.capacity ?? null,
      location: parsed.data.location || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create class" }, { status: 500 });

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId: parsed.data.mosqueId,
    action: "islamic_class.create",
    resourceType: "islamic_class",
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
  const { data: existing } = await supabase.from("islamic_classes").select("mosque_id").eq("id", id).single();
  if (!existing || !canManageMosque(ctx, existing.mosque_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("islamic_classes").update({ is_active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to remove class" }, { status: 500 });

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId: existing.mosque_id,
    action: "islamic_class.deactivate",
    resourceType: "islamic_class",
    resourceId: id,
  });

  return NextResponse.json({ ok: true });
}
