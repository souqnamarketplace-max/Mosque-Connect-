import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password format" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Determine admin scope: platform admin, or which mosques they administer.
  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const { data: mosqueAdminRows } = await supabase
    .from("mosque_admins")
    .select("mosque_id, role")
    .eq("user_id", data.user.id);

  const isPlatformAdmin = !!platformAdmin;
  const mosqueIds = (mosqueAdminRows ?? []).map((r) => r.mosque_id);

  if (!isPlatformAdmin && mosqueIds.length === 0) {
    // Authenticated but has no admin role anywhere — sign them back out.
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "This account has no mosque administration access." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    isPlatformAdmin,
    mosqueIds,
    email: data.user.email,
  });
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.json({ authenticated: false });
  }

  const { data: platformAdmin } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const { data: mosqueAdminRows } = await supabase
    .from("mosque_admins")
    .select("mosque_id, role")
    .eq("user_id", userData.user.id);

  return NextResponse.json({
    authenticated: true,
    isPlatformAdmin: !!platformAdmin,
    mosqueIds: (mosqueAdminRows ?? []).map((r) => r.mosque_id),
    email: userData.user.email,
  });
}

export async function DELETE() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
