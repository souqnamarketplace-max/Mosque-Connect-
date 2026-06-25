import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, canManageMosque } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/adminAudit";

const createSchema = z.object({
  mosqueId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(["friday_program", "youth_program", "ramadan_program", "community", "other"]),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().optional().or(z.literal("")),
  endTime: z.string().optional().or(z.literal("")),
  location: z.string().max(300).optional(),
  speaker: z.string().max(200).optional(),
  registrationUrl: z.string().url().optional().or(z.literal("")),
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
    .from("events")
    .select("*")
    .eq("mosque_id", mosqueId)
    .order("event_date", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
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
    .from("events")
    .insert({
      mosque_id: parsed.data.mosqueId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category,
      event_date: parsed.data.eventDate,
      start_time: parsed.data.startTime || null,
      end_time: parsed.data.endTime || null,
      location: parsed.data.location || null,
      speaker: parsed.data.speaker || null,
      registration_url: parsed.data.registrationUrl || null,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create event" }, { status: 500 });

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId: parsed.data.mosqueId,
    action: "event.create",
    resourceType: "event",
    resourceId: data.id,
    details: { title: data.title, eventDate: data.event_date },
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
  const { data: existing } = await supabase.from("events").select("mosque_id").eq("id", id).single();
  if (!existing || !canManageMosque(ctx, existing.mosque_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId: existing.mosque_id,
    action: "event.delete",
    resourceType: "event",
    resourceId: id,
  });

  return NextResponse.json({ ok: true });
}
