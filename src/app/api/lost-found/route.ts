import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOnboardingState } from "@/lib/onboardingState";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/userAuth";

const createSchema = z.object({
  postType: z.enum(["lost", "found"]),
  category: z.enum(["electronics", "keys", "clothing", "jewelry", "documents", "bag", "other"]),
  title: z.string().min(1).max(150),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  locationNote: z.string().max(200).optional(),
  contactMethod: z.enum(["in_app", "phone", "email"]),
  contactValue: z.string().max(200).optional(),
});

export async function GET(request: NextRequest) {
  const { mosqueId } = await getOnboardingState();
  if (!mosqueId) return NextResponse.json([]);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "open";

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("lost_found_posts")
    .select("id, post_type, category, title, description, image_url, location_note, contact_method, status, created_at, posted_by")
    .eq("mosque_id", mosqueId)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { mosqueId } = await getOnboardingState();
  if (!mosqueId) {
    return NextResponse.json({ error: "No mosque selected" }, { status: 400 });
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session. Call /api/auth/ensure-session first." }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.contactMethod !== "in_app" && !parsed.data.contactValue) {
    return NextResponse.json({ error: "Contact value is required for phone/email contact method" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("lost_found_posts")
    .insert({
      mosque_id: mosqueId,
      posted_by: userId,
      post_type: parsed.data.postType,
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description || null,
      image_url: parsed.data.imageUrl || null,
      location_note: parsed.data.locationNote || null,
      contact_method: parsed.data.contactMethod,
      contact_value: parsed.data.contactMethod === "in_app" ? null : parsed.data.contactValue,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "No session." }, { status: 401 });

  const schema = z.object({ id: z.string().uuid() });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("lost_found_posts")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", parsed.data.id);

  if (error) return NextResponse.json({ error: "Failed to update post (you may not have permission)" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
