"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import en from "./en";
import ar from "./ar";
import ur from "./ur";
import type { TranslationDict } from "./en";

export type LanguageCode = "en" | "ar" | "ur";

const DICTIONARIES: Record<LanguageCode, TranslationDict> = { en, ar, ur };
const RTL_LANGUAGES: LanguageCode[] = ["ar", "ur"];

interface I18nContextValue {
  language: LanguageCode;
  dict: TranslationDict;
  dir: "ltr" | "rtl";
  setLanguage: (lang: LanguageCode) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readLanguageCookie(): LanguageCode {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|; )mc_language=([^;]+)/);
  const value = match?.[1];
  return value === "ar" || value === "ur" ? value : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    setLanguageState(readLanguageCookie());
  }, []);

  useEffect(() => {
    const dir = RTL_LANGUAGES.includes(language) ? "rtl" : "ltr";
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language]);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    document.cookie = `mc_language=${lang}; path=/; max-age=${60 * 60 * 24 * 365 * 2}`;
  };

  const dir = RTL_LANGUAGES.includes(language) ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ language, dict: DICTIONARIES[language], dir, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

/** Server-side helper: reads the language cookie value directly (no React context). */
export { DICTIONARIES, RTL_LANGUAGES };
