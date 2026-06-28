"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import OnboardingProgress from "@/components/OnboardingProgress";
import { useI18n } from "@/lib/i18n/I18nProvider";

const LANGUAGES: Array<{ code: "en" | "ar" | "ur"; nativeLabel: string; englishLabel: string }> = [
  { code: "en", nativeLabel: "English", englishLabel: "English" },
  { code: "ar", nativeLabel: "العربية", englishLabel: "Arabic" },
  { code: "ur", nativeLabel: "اردو", englishLabel: "Urdu" },
];

export default function LanguageSelectionPage() {
  const router = useRouter();
  const { dict, setLanguage } = useI18n();
  const [selected, setSelected] = useState<"en" | "ar" | "ur" | null>(null);
  const [saving, setSaving] = useState(false);

  // Onboarding is the earliest point a person interacts with the app, so
  // this is where the anonymous session should be created — not deferred
  // to the Home Screen — so that mosque selection a few steps later can be
  // tied to a real user_id immediately rather than only a cookie.
  useEffect(() => {
    fetch("/api/auth/ensure-session", { method: "POST" }).catch(() => {});
  }, []);

  const handleContinue = async () => {
    if (!selected) return;
    setSaving(true);
    setLanguage(selected); // updates UI immediately (context + cookie)
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: selected }),
    });
    router.push("/onboarding/province");
  };

  return (
    <div className="min-h-screen bg-sand flex flex-col">
      <main className="flex-1 max-w-md mx-auto w-full px-6 pt-12 pb-8 flex flex-col">
        <OnboardingProgress step={1} total={4} />

        <h1 className="font-display text-2xl text-center mb-2">{dict.onboarding.language.title}</h1>
        <p className="text-center text-ink/60 text-sm mb-8">{dict.onboarding.language.subtitle}</p>

        <div className="space-y-3 flex-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelected(lang.code)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-colors ${
                selected === lang.code
                  ? "border-night-teal bg-night-teal/5"
                  : "border-sand-dark bg-white hover:border-sage"
              }`}
            >
              <span className="font-display text-lg block">{lang.nativeLabel}</span>
              {lang.code !== "en" && <span className="text-xs text-ink/60">{lang.englishLabel}</span>}
            </button>
          ))}
        </div>

        <button
          onClick={handleContinue}
          disabled={!selected || saving}
          className="w-full py-4 rounded-full bg-night-teal text-sand font-medium mt-8 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-night-teal-light transition-colors"
        >
          {saving ? dict.common.saving : dict.common.continue}
        </button>
      </main>
    </div>
  );
}
