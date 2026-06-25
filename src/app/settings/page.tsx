"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Globe, MapPin, Bell, Moon, Sun, Monitor, ShieldCheck } from "lucide-react";

interface CurrentSettings {
  language: "en" | "ar" | "ur" | null;
  mosque: { id: string; name: string } | null;
  city: { id: string; name: string } | null;
  province: { id: string; name: string; code: string } | null;
}

const LANGUAGE_LABELS: Record<string, string> = { en: "English", ar: "العربية", ur: "اردو" };
const THEMES: Array<{ value: "light" | "dark" | "system"; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<CurrentSettings | null>(null);
  const [theme, setThemeState] = useState<"light" | "dark" | "system">("system");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/onboarding/current")
      .then((res) => res.json())
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  const saveTheme = (value: "light" | "dark" | "system") => {
    setThemeState(value);
    fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: value }),
    });
  };

  return (
    <div className="min-h-screen bg-sand">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button onClick={() => router.back()} aria-label="Back" className="text-ink/60 hover:text-ink">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="font-display text-xl">Settings</h1>
      </header>

      <main className="max-w-md mx-auto px-5 pb-16 space-y-6">
        {/* Location & Mosque */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-2">Location & Mosque</h2>
          <div className="bg-white rounded-2xl divide-y divide-sand-dark">
            <SettingsRow
              icon={MapPin}
              label="Mosque"
              value={loading ? "…" : settings?.mosque?.name ?? "Not set"}
              href="/onboarding/province"
            />
            <SettingsRow
              icon={MapPin}
              label="City"
              value={loading ? "…" : settings?.city?.name ?? "Not set"}
              href="/onboarding/province"
            />
            <SettingsRow
              icon={MapPin}
              label="Province"
              value={loading ? "…" : settings?.province?.name ?? "Not set"}
              href="/onboarding/province"
            />
          </div>
        </div>

        {/* Language */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-2">Language</h2>
          <div className="bg-white rounded-2xl">
            <SettingsRow
              icon={Globe}
              label="App Language"
              value={loading ? "…" : LANGUAGE_LABELS[settings?.language ?? "en"]}
              href="/onboarding/language"
            />
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-2">Notifications</h2>
          <div className="bg-white rounded-2xl divide-y divide-sand-dark">
            <SettingsRow icon={Bell} label="Athan Settings" href="/athan-settings" />
            <SettingsRow icon={Bell} label="Dua Reminder Settings" href="/dua-reminder-settings" />
          </div>
        </div>

        {/* Theme */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-2">Theme</h2>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => saveTheme(value)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-sm transition-colors ${
                  theme === value ? "bg-night-teal text-sand" : "bg-white text-ink/70 hover:bg-sand-dark"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Admin */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-2">Mosque Administration</h2>
          <div className="bg-white rounded-2xl">
            <SettingsRow icon={ShieldCheck} label="Admin Login" href="/admin/login" />
          </div>
        </div>
      </main>
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Globe;
  label: string;
  value?: string;
  href: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 p-4 hover:bg-sand-dark/30 transition-colors">
      <Icon className="w-4 h-4 text-night-teal flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {value && <span className="text-sm text-ink/50">{value}</span>}
      <ChevronRight className="w-4 h-4 text-ink/30" />
    </Link>
  );
}
