import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext, canManageMosque } from "@/lib/adminAuth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/adminAudit";

const updateSchema = z.object({
  mosqueId: z.string().uuid(),
  description: z.string().max(2000).optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  officeHours: z.string().max(300).optional(),
  donationLink: z.string().url().optional().or(z.literal("")),
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
  const { data, error } = await supabase.from("mosques").select("*").eq("id", mosqueId).single();
  if (error) return NextResponse.json({ error: "Mosque not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  if (!canManageMosque(ctx, parsed.data.mosqueId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { mosqueId, ...fields } = parsed.data;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("mosques")
    .update({
      description: fields.description || null,
      address: fields.address || null,
      phone: fields.phone || null,
      email: fields.email || null,
      website: fields.website || null,
      office_hours: fields.officeHours || null,
      donation_link: fields.donationLink || null,
    })
    .eq("id", mosqueId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });

  await logAdminAction({
    actorUserId: ctx.userId,
    mosqueId,
    action: "mosque_profile.update",
    resourceType: "mosque",
    resourceId: mosqueId,
  });
  return NextResponse.json(data);
}
