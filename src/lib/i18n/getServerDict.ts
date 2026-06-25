import "server-only";
import { cookies } from "next/headers";
import en from "./en";
import ar from "./ar";
import ur from "./ur";
import type { LanguageCode } from "./I18nProvider";

const DICTIONARIES = { en, ar, ur };

/** For use in Server Components / route handlers — reads the language cookie
 * directly via next/headers rather than the client-side I18nProvider context. */
export async function getServerDict() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("mc_language")?.value;
  const language: LanguageCode = raw === "ar" || raw === "ur" ? raw : "en";
  return { language, dict: DICTIONARIES[language], dir: language === "en" ? "ltr" : ("rtl" as const) };
}
