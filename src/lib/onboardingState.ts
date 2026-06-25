import { cookies } from "next/headers";
import { z } from "zod";

const LANGUAGE_COOKIE = "mc_language";
const MOSQUE_ID_COOKIE = "mc_mosque_id";
const THEME_COOKIE = "mc_theme";

const languageSchema = z.enum(["en", "ar", "ur"]);
const themeSchema = z.enum(["light", "dark", "system"]);
const uuidSchema = z.string().uuid();

export async function getOnboardingState() {
  const cookieStore = await cookies();
  const language = languageSchema.safeParse(cookieStore.get(LANGUAGE_COOKIE)?.value).data ?? null;
  const mosqueId = uuidSchema.safeParse(cookieStore.get(MOSQUE_ID_COOKIE)?.value).data ?? null;
  const theme = themeSchema.safeParse(cookieStore.get(THEME_COOKIE)?.value).data ?? "system";
  return { language, mosqueId, theme };
}

export async function setLanguage(language: "en" | "ar" | "ur") {
  const cookieStore = await cookies();
  cookieStore.set(LANGUAGE_COOKIE, language, {
    httpOnly: false, // read client-side for instant UI language switching
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 2,
    path: "/",
  });
}

export async function setTheme(theme: "light" | "dark" | "system") {
  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, theme, {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 2,
    path: "/",
  });
}

export async function setMosqueId(mosqueId: string) {
  const parsed = uuidSchema.safeParse(mosqueId);
  if (!parsed.success) throw new Error("Invalid mosque_id");
  const cookieStore = await cookies();
  cookieStore.set(MOSQUE_ID_COOKIE, parsed.data, {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 2,
    path: "/",
  });
}

export { LANGUAGE_COOKIE, MOSQUE_ID_COOKIE, THEME_COOKIE };
