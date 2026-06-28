import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/userAuth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session." }, { status: 401 });
  }

  const rateLimit = await checkRateLimit("familyInviteCreate", request, userId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many invites created. Please wait a few minutes before trying again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.reset - Date.now()) / 1000)) } }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: membership } = await supabase
    .from("family_members")
    .select("family_id, is_account_owner")
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "You don't belong to a family yet" }, { status: 400 });
  }
  if (!membership.is_account_owner) {
    return NextResponse.json({ error: "Only the family owner can invite new members" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("family_invites")
    .insert({ family_id: membership.family_id, invited_by: userId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }

  return NextResponse.json({ acceptUrl: `/family/join?token=${data.token}`, expiresAt: data.expires_at });
}
