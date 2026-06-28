import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, canManageMosque } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const createShiftSchema = z.object({
  opportunityId: z.string().uuid(),
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  capacity: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createShiftSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: opportunity } = await supabase
    .from("volunteer_opportunities")
    .select("mosque_id")
    .eq("id", parsed.data.opportunityId)
    .single();

  if (!opportunity || !canManageMosque(ctx, opportunity.mosque_id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("volunteer_shifts")
    .insert({
      opportunity_id: parsed.data.opportunityId,
      shift_date: parsed.data.shiftDate,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      capacity: parsed.data.capacity ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create shift" }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: shift } = await supabase
    .from("volunteer_shifts")
    .select("opportunity_id, volunteer_opportunities(mosque_id)")
    .eq("id", id)
    .single();

  const mosqueId = (shift?.volunteer_opportunities as unknown as { mosque_id: string } | null)?.mosque_id;
  if (!shift || !mosqueId || !canManageMosque(ctx, mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("volunteer_shifts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to delete shift" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
