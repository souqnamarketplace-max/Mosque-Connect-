"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface DuaCategory {
  id: string;
  code: string;
  label_en: string;
  label_ar: string;
  label_ur: string;
}

interface DuaContent {
  category: string;
  categoryLabel: string;
  text: string;
  transliteration: string | null;
  sourceReference: string | null;
  audioUrl?: string | null;
}

function DuaCard({ dua, dict }: { dua: DuaContent; dict: ReturnType<typeof useI18n>["dict"] }) {
  return (
    <div className="bg-card rounded-2xl p-4">
      <p className="text-xs font-medium text-night-teal mb-2">{dua.categoryLabel}</p>
      <p
        dir="rtl"
        lang="ar"
        style={{ fontFamily: "var(--font-arabic)" }}
        className="text-xl leading-loose text-right mb-3"
      >
        {dua.text}
      </p>
      {dua.transliteration && (
        <p className="text-sm text-ink/70 italic mb-1">
          <span className="text-ink/50 not-italic">{dict.duas.transliteration}: </span>
          {dua.transliteration}
        </p>
      )}
      {dua.sourceReference && (
        <p className="text-xs text-ink/50">
          {dict.duas.source}: {dua.sourceReference}
        </p>
      )}
    </div>
  );
}

export default function DuasPage() {
  const router = useRouter();
  const { dict, language } = useI18n();

  const [featured, setFeatured] = useState<DuaContent | null>(null);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  const [categories, setCategories] = useState<DuaCategory[]>([]);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [categoryContent, setCategoryContent] = useState<Record<string, DuaContent | null>>({});

  useEffect(() => {
    fetch(`/api/dua-content/featured?lang=${language}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setFeatured)
      .finally(() => setLoadingFeatured(false));
  }, [language]);

  useEffect(() => {
    fetch("/api/dua-categories")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  const categoryLabel = (c: DuaCategory) =>
    language === "ar" ? c.label_ar || c.label_en : language === "ur" ? c.label_ur || c.label_en : c.label_en;

  const toggleCategory = (code: string) => {
    if (expandedCode === code) {
      setExpandedCode(null);
      return;
    }
    setExpandedCode(code);
    if (categoryContent[code] === undefined) {
      fetch(`/api/dua-content/by-category?category=${code}&lang=${language}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setCategoryContent((prev) => ({ ...prev, [code]: data })))
        .catch(() => setCategoryContent((prev) => ({ ...prev, [code]: null })));
    }
  };

  return (
    <div className="min-h-screen bg-sand pb-16">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button
          onClick={() => router.back()}
          aria-label={dict.duas.back}
          className="text-ink/60 hover:text-ink p-1"
        >
          <ChevronLeft className="w-7 h-7 rtl:rotate-180" />
        </button>
        <h1 className="font-display text-xl">{dict.duas.title}</h1>
      </header>

      <main className="max-w-md mx-auto px-5 space-y-6">
        {loadingFeatured ? (
          <div className="h-40 rounded-2xl bg-card/60 animate-pulse" />
        ) : featured ? (
          <DuaCard dua={featured} dict={dict} />
        ) : (
          <p className="text-center text-ink/60 py-8">{dict.duas.empty}</p>
        )}

        {categories.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-ink/60 mb-2">{dict.duas.categories}</h2>
            <div className="bg-card rounded-2xl divide-y divide-sand-dark overflow-hidden">
              {categories.map((c) => (
                <div key={c.id}>
                  <button
                    onClick={() => toggleCategory(c.code)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-sand-dark/30 transition-colors"
                  >
                    <span>{categoryLabel(c)}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-ink/60 flex-shrink-0 transition-transform ${
                        expandedCode === c.code ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedCode === c.code && (
                    <div className="px-4 pb-4">
                      {categoryContent[c.code] === undefined ? (
                        <p className="text-sm text-ink/60 py-2">{dict.common.loading}</p>
                      ) : categoryContent[c.code] === null ? (
                        <p className="text-sm text-ink/60 py-2">{dict.duas.empty}</p>
                      ) : (
                        <DuaCard dua={categoryContent[c.code]!} dict={dict} />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
