"use client";

import { useEffect, useState } from "react";

interface DuaPayload {
  category: string;
  categoryLabel: string;
  text: string;
  transliteration: string | null;
  sourceReference: string | null;
}

export default function DailyContentCard({
  categoryCode,
  title,
  language,
}: {
  categoryCode: string;
  title: string;
  language: "en" | "ar" | "ur";
}) {
  const [content, setContent] = useState<DuaPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/dua-content/by-category?category=${categoryCode}&lang=${language}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setContent)
      .finally(() => setLoading(false));
  }, [categoryCode, language]);

  if (loading) {
    return <div className="h-24 rounded-2xl bg-white/60 animate-pulse" />;
  }
  if (!content) return null;

  return (
    <div className="bg-white rounded-2xl p-4 border border-sand-dark">
      <p className="text-xs uppercase tracking-wide text-sage mb-2">{title}</p>
      <p className={`leading-relaxed ${language === "ar" ? "text-right" : ""}`} dir={language === "ar" ? "rtl" : "ltr"}>
        {content.text}
      </p>
      {content.sourceReference && <p className="text-xs text-ink/60 mt-2">— {content.sourceReference}</p>}
    </div>
  );
}
