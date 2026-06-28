import { NextResponse } from "next/server";
import { getOnboardingState } from "@/lib/onboardingState";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const { mosqueId } = await getOnboardingState();
  if (!mosqueId) {
    return NextResponse.json({ error: "No mosque selected" }, { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("mosques")
    .select(
      "id, name, logo_url, cover_image_url, description, address, phone, email, website, office_hours, latitude, longitude, donation_link"
    )
    .eq("id", mosqueId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Mosque not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
