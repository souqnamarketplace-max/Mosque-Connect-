import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, canManageMosque } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/adminAudit";

const createSchema = z.object({
  mosqueId: z.string().uuid(),
  title: z.string().max(200).optional(),
  source: z.enum(["youtube", "facebook", "custom"]),
  streamUrl: z.string().url(),
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
    .from("live_streams")
    .select("*")
    .eq("mosque_id", mosqueId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: "Failed to load streams" }, { status: 500 });
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

  // Going live: end any other currently-live stream for this mosque first
  // (only one can be live at a time), then start the new one.
  await supabase
    .from("live_streams")
    .update({ is_live: false, ended_at: new Date().toISOString() })
    .eq("mosque_id", parsed.data.mosqueId)
    .eq("is_live", true);

  const { data, error } = await supabase
    .from("live_streams")
    .insert({
      mosque_id: parsed.data.mosqueId,
      title: parsed.data.title || null,
      source: parsed.data.source,
      stream_url: parsed.data.streamUrl,
      is_live: true,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to start stream" }, { status: 500 });

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId: parsed.data.mosqueId,
    action: "live_stream.start",
    resourceType: "live_stream",
    resourceId: data.id,
    details: { source: data.source, title: data.title },
  });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schema = z.object({ id: z.string().uuid(), recordingUrl: z.string().url().optional() });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: existing } = await supabase
    .from("live_streams")
    .select("mosque_id")
    .eq("id", parsed.data.id)
    .single();
  if (!existing || !canManageMosque(ctx, existing.mosque_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // End the stream — sets is_live false, records end time, optionally attaches a recording URL.
  const { error } = await supabase
    .from("live_streams")
    .update({
      is_live: false,
      ended_at: new Date().toISOString(),
      recording_url: parsed.data.recordingUrl ?? null,
    })
    .eq("id", parsed.data.id);

  if (error) return NextResponse.json({ error: "Failed to end stream" }, { status: 500 });

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId: existing.mosque_id,
    action: "live_stream.end",
    resourceType: "live_stream",
    resourceId: parsed.data.id,
    details: { recordingUrl: parsed.data.recordingUrl ?? null },
  });

  return NextResponse.json({ ok: true });
}
