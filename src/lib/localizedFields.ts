import type { LanguageCode } from "@/lib/i18n/I18nProvider";

/**
 * Given a row with English + _ar/_ur variant columns for a set of fields,
 * returns a new object where each base field name now holds the value in
 * the requested language — falling back to the English value whenever the
 * translated column is null (e.g. an admin hasn't translated this item
 * yet). This is the single place that implements the "serve the right
 * language, fall back to English, never show null" rule, so every content
 * API (announcements, events, classes, etc.) behaves identically rather
 * than each route reimplementing its own fallback logic slightly
 * differently.
 *
 * Example: resolveLocalizedFields(row, ["title", "body"], "ar") turns
 * { title: "Hello", title_ar: "أهلاً", title_ur: null, body: "...", ... }
 * into { title: "أهلاً", body: <English body, since body_ar was null>, ... }
 * — the _ar/_ur source columns are removed from the returned object so API
 * responses don't leak the untranslated variants to the client.
 */
export function resolveLocalizedFields<T extends Record<string, unknown>>(
  row: T,
  fields: string[],
  language: LanguageCode
): T {
  const result = { ...row } as Record<string, unknown>;

  for (const field of fields) {
    if (language === "en") {
      delete result[`${field}_ar`];
      delete result[`${field}_ur`];
      continue;
    }

    const variantKey = `${field}_${language}`;
    const variantValue = row[variantKey] as string | null | undefined;
    if (variantValue) {
      result[field] = variantValue;
    }
    delete result[`${field}_ar`];
    delete result[`${field}_ur`];
  }

  return result as T;
}

/** Applies resolveLocalizedFields across an array of rows. */
export function resolveLocalizedFieldsForList<T extends Record<string, unknown>>(
  rows: T[],
  fields: string[],
  language: LanguageCode
): T[] {
  return rows.map((row) => resolveLocalizedFields(row, fields, language));
}
