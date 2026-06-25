import { NextResponse } from "next/server";
import { getOnboardingState } from "@/lib/onboardingState";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const { mosqueId } = await getOnboardingState();
  if (!mosqueId) {
    return NextResponse.json([]);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("donation_campaigns")
    .select("id, category, title, description, image_url, goal_amount, raised_amount, currency")
    .eq("mosque_id", mosqueId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load campaigns" }, { status: 500 });
  }
  return NextResponse.json(data);
}
