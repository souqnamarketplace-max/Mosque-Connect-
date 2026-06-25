"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

interface DuaCategory {
  id: string;
  code: string;
  label_en: string;
  label_ar: string | null;
  label_ur: string | null;
}

interface DuaPrefs {
  enabled: boolean;
  enabled_categories: string[];
  preferred_language: "en" | "ar" | "ur";
  reminder_times: Record<string, string>;
}

const LANGUAGES: Array<{ code: "en" | "ar" | "ur"; label: string }> = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "ur", label: "اردو" },
];

export default function DuaReminderSettingsPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<DuaCategory[]>([]);
  const [prefs, setPrefs] = useState<DuaPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      await fetch("/api/device/init", { method: "POST" });
      const [catsRes, prefsRes] = await Promise.all([
        fetch("/api/dua-categories"),
        fetch("/api/dua-reminder-preferences"),
      ]);
      setCategories(await catsRes.json());
      setPrefs(await prefsRes.json());
      setLoading(false);
    }
    load();
  }, []);

  const save = useCallback((patch: Partial<DuaPrefs>) => {
    setPrefs((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaving(true);
    fetch("/api/dua-reminder-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).finally(() => setSaving(false));
  }, []);

  const toggleCategory = (code: string) => {
    if (!prefs) return;
    const isEnabled = prefs.enabled_categories.includes(code);
    const updated = isEnabled
      ? prefs.enabled_categories.filter((c) => c !== code)
      : [...prefs.enabled_categories, code];
    save({ enabled_categories: updated });
  };

  const setCategoryTime = (code: string, time: string) => {
    if (!prefs) return;
    save({ reminder_times: { ...prefs.reminder_times, [code]: time } });
  };

  if (loading || !prefs) {
    return <div className="p-6 text-center text-ink/50">Loading settings…</div>;
  }

  return (
    <div className="min-h-screen bg-sand">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button onClick={() => router.back()} aria-label="Back" className="text-ink/60 hover:text-ink">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="font-display text-xl">Dua Reminders</h1>
        {saving && <span className="text-xs text-ink/40 ml-auto">Saving…</span>}
      </header>

      <main className="max-w-md mx-auto px-5 pb-16 space-y-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-4">
          <span className="font-medium">Enable Reminders</span>
          <ToggleSwitch checked={prefs.enabled} onChange={(v) => save({ enabled: v })} />
        </div>

        {/* Language */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-2">Language</h2>
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => save({ preferred_language: lang.code })}
                className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                  prefs.preferred_language === lang.code
                    ? "bg-night-teal text-sand"
                    : "bg-white text-ink/70 hover:bg-sand-dark"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-2">Reminder Categories</h2>
          <div className={`bg-white rounded-2xl divide-y divide-sand-dark ${!prefs.enabled ? "opacity-50" : ""}`}>
            {categories.map((cat) => {
              const isEnabled = prefs.enabled_categories.includes(cat.code);
              const label =
                prefs.preferred_language === "ar"
                  ? cat.label_ar ?? cat.label_en
                  : prefs.preferred_language === "ur"
                  ? cat.label_ur ?? cat.label_en
                  : cat.label_en;
              return (
                <div key={cat.code} className="p-4">
                  <div className="flex items-center justify-between">
                    <span>{label}</span>
                    <ToggleSwitch
                      checked={isEnabled}
                      onChange={() => toggleCategory(cat.code)}
                    />
                  </div>
                  {isEnabled && (
                    <input
                      type="time"
                      value={prefs.reminder_times[cat.code] ?? ""}
                      onChange={(e) => setCategoryTime(cat.code, e.target.value)}
                      className="mt-2 w-full bg-sand-dark/30 rounded-lg px-3 py-2 text-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${
        checked ? "bg-night-teal" : "bg-sand-dark"
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}
