"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Globe, MapPin, Bell, Moon, Sun, Monitor, ShieldCheck, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import FooterNav from "@/components/FooterNav";

interface CurrentSettings {
  language: "en" | "ar" | "ur" | null;
  mosque: { id: string; name: string } | null;
  city: { id: string; name: string; name_ar: string | null; name_ur: string | null } | null;
  province: { id: string; name: string; name_ar: string | null; name_ur: string | null; code: string } | null;
}

const LANGUAGE_LABELS: Record<string, string> = { en: "English", ar: "العربية", ur: "اردو" };

export default function SettingsPage() {
  const router = useRouter();
  const { dict, language } = useI18n();
  const [settings, setSettings] = useState<CurrentSettings | null>(null);
  const [theme, setThemeState] = useState<"light" | "dark" | "system">("system");
  const [loading, setLoading] = useState(true);

  const localizedCity = settings?.city
    ? language === "ar"
      ? settings.city.name_ar ?? settings.city.name
      : language === "ur"
      ? settings.city.name_ur ?? settings.city.name
      : settings.city.name
    : null;

  const localizedProvince = settings?.province
    ? language === "ar"
      ? settings.province.name_ar ?? settings.province.name
      : language === "ur"
      ? settings.province.name_ur ?? settings.province.name
      : settings.province.name
    : null;

  const THEMES: Array<{ value: "light" | "dark" | "system"; label: string; icon: typeof Sun }> = [
    { value: "light", label: dict.settings.themeLight, icon: Sun },
    { value: "dark", label: dict.settings.themeDark, icon: Moon },
    { value: "system", label: dict.settings.themeSystem, icon: Monitor },
  ];

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
    <div className="min-h-screen bg-sand pb-24">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button onClick={() => router.back()} aria-label={dict.common.back} className="text-ink/60 hover:text-ink">
          <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
        </button>
        <h1 className="font-display text-xl">{dict.settings.title}</h1>
      </header>

      <main className="max-w-md mx-auto px-5 pb-16 space-y-6">
        {/* Location & Mosque */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-2">{dict.settings.locationMosque}</h2>
          <div className="bg-card rounded-2xl divide-y divide-sand-dark">
            <SettingsRow
              icon={MapPin}
              label={dict.settings.mosque}
              value={loading ? "…" : settings?.mosque?.name ?? dict.common.notSet}
              href="/onboarding/province"
            />
            <SettingsRow
              icon={MapPin}
              label={dict.settings.city}
              value={loading ? "…" : localizedCity ?? dict.common.notSet}
              href="/onboarding/province"
            />
            <SettingsRow
              icon={MapPin}
              label={dict.settings.province}
              value={loading ? "…" : localizedProvince ?? dict.common.notSet}
              href="/onboarding/province"
            />
          </div>
        </div>

        {/* Language */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-2">{dict.settings.languageSection}</h2>
          <div className="bg-card rounded-2xl">
            <SettingsRow
              icon={Globe}
              label={dict.settings.appLanguage}
              value={loading ? "…" : LANGUAGE_LABELS[settings?.language ?? "en"]}
              href="/onboarding/language"
            />
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-2">{dict.settings.notifications}</h2>
          <div className="bg-card rounded-2xl divide-y divide-sand-dark">
            <SettingsRow icon={Bell} label={dict.settings.athanSettings} href="/athan-settings" />
            <SettingsRow icon={Bell} label={dict.settings.duaReminderSettings} href="/dua-reminder-settings" />
            <SettingsRow icon={Bell} label={dict.notificationSettings.title} href="/notification-settings" />
          </div>
        </div>

        {/* Family */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-2">{dict.family.title}</h2>
          <div className="bg-card rounded-2xl">
            <SettingsRow icon={Users} label={dict.family.title} href="/family" />
          </div>
        </div>

        {/* Theme */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-2">{dict.settings.theme}</h2>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => saveTheme(value)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-sm transition-colors ${
                  theme === value ? "bg-night-teal text-sand" : "bg-card text-ink/70 hover:bg-sand-dark"
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
          <h2 className="text-sm font-medium text-ink/60 mb-2">{dict.settings.mosqueAdmin}</h2>
          <div className="bg-card rounded-2xl">
            <SettingsRow icon={ShieldCheck} label={dict.settings.adminLogin} href="/admin/login" />
          </div>
        </div>
      </main>
      <FooterNav />
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
      {value && <span className="text-sm text-ink/60">{value}</span>}
      <ChevronRight className="w-4 h-4 text-ink/60 rtl:rotate-180" />
    </Link>
  );
}
