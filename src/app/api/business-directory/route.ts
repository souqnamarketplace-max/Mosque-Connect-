import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOnboardingState } from "@/lib/onboardingState";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/userAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { getServerDict } from "@/lib/i18n/getServerDict";
import { resolveLocalizedFieldsForList } from "@/lib/localizedFields";

const createSchema = z.object({
  businessName: z.string().min(1).max(150),
  category: z.enum([
    "restaurant",
    "grocery",
    "retail",
    "professional_services",
    "health_medical",
    "real_estate",
    "automotive",
    "education",
    "beauty_personal_care",
    "other",
  ]),
  description: z.string().max(1000).optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(30).optional(),
  website: z.string().url().optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  const { mosqueId } = await getOnboardingState();
  if (!mosqueId) return NextResponse.json([]);

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const { language } = await getServerDict();

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("business_directory")
    .select(
      "id, business_name, business_name_ar, business_name_ur, category, description, description_ar, description_ur, address, phone, website, logo_url"
    )
    .eq("mosque_id", mosqueId)
    .eq("status", "approved");

  if (category) query = query.eq("category", category);

  const { data, error } = await query.order("business_name", { ascending: true });
  if (error) return NextResponse.json({ error: "Failed to load directory" }, { status: 500 });
  return NextResponse.json(resolveLocalizedFieldsForList(data ?? [], ["business_name", "description"], language));
}

export async function POST(request: NextRequest) {
  const { mosqueId } = await getOnboardingState();
  if (!mosqueId) return NextResponse.json({ error: "No mosque selected" }, { status: 400 });

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session. Call /api/auth/ensure-session first." }, { status: 401 });
  }

  const rateLimit = await checkRateLimit("businessDirectorySubmit", request, userId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait a few minutes before submitting again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.reset - Date.now()) / 1000)) } }
    );
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("business_directory")
    .insert({
      mosque_id: mosqueId,
      submitted_by: userId,
      business_name: parsed.data.businessName,
      category: parsed.data.category,
      description: parsed.data.description || null,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      website: parsed.data.website || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to submit listing" }, { status: 500 });
  return NextResponse.json(data);
}
