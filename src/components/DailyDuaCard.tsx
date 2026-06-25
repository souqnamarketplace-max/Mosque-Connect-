"use client";

import { useEffect, useState } from "react";

interface DuaPayload {
  category: string;
  categoryLabel: string;
  text: string;
  transliteration: string | null;
  sourceReference: string | null;
}

const LANGS: Array<{ code: "en" | "ar" | "ur"; label: string }> = [
  { code: "en", label: "EN" },
  { code: "ar", label: "AR" },
  { code: "ur", label: "UR" },
];

export default function DailyDuaCard() {
  const [lang, setLang] = useState<"en" | "ar" | "ur">("en");
  const [dua, setDua] = useState<DuaPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dua-content/featured?lang=${lang}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setDua)
      .finally(() => setLoading(false));
  }, [lang]);

  if (loading) {
    return <div className="h-32 rounded-2xl bg-sand-dark/50 animate-pulse" />;
  }

  if (!dua) return null;

  return (
    <div className="bg-night-teal text-sand rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wide text-sand/70">{dua.categoryLabel}</span>
        <div className="flex gap-1">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`text-xs px-2 py-1 rounded-full transition-colors ${
                lang === l.code ? "bg-gold text-ink" : "text-sand/60 hover:text-sand"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <p className={`font-display text-lg leading-relaxed ${lang === "ar" ? "text-right" : ""}`} dir={lang === "ar" ? "rtl" : "ltr"}>
        {dua.text}
      </p>
      {dua.transliteration && <p className="text-sm text-sand/70 mt-2 italic">{dua.transliteration}</p>}
      {dua.sourceReference && <p className="text-xs text-sand/50 mt-2">— {dua.sourceReference}</p>}
    </div>
  );
}
