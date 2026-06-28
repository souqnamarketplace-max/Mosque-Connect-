/**
 * Prayer names in Arabic script — shown alongside the localized name
 * (English/Urdu/whatever the UI language is) regardless of which language
 * is selected, per explicit product decision: prayer names are
 * traditionally bilingual in Islamic apps even when the rest of the UI is
 * strictly single-language. This is the ONE deliberate exception to the
 * "never mix languages" rule; nothing else in the app should mix scripts.
 */
export const PRAYER_NAMES_ARABIC: Record<"fajr" | "dhuhr" | "asr" | "maghrib" | "isha" | "jumuah", string> = {
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
  jumuah: "الجمعة",
};
