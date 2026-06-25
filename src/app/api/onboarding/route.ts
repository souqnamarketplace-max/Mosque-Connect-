import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setLanguage, setMosqueId, setTheme } from "@/lib/onboardingState";

const bodySchema = z.object({
  language: z.enum(["en", "ar", "ur"]).optional(),
  mosqueId: z.string().uuid().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.language) await setLanguage(parsed.data.language);
  if (parsed.data.mosqueId) await setMosqueId(parsed.data.mosqueId);
  if (parsed.data.theme) await setTheme(parsed.data.theme);

  return NextResponse.json({ ok: true });
}
