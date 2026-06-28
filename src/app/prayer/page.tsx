"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import PrayerCountdownWidget from "@/components/PrayerCountdownWidget";
import FooterNav from "@/components/FooterNav";
import { getCachedPrayerPayload, getMostRecentCachedPayload } from "@/lib/offline/prayerCache";

const DEMO_MOSQUE_ID = "923dff27-c983-4c07-bf19-e94b42961d91";

interface PrayerTimesPayload {
  date: string;
  adhan: Record<string, string>;
  iqama: Record<string, string> | null;
  isJumuah: boolean;
}

export default function PrayerPage() {
  const { dict } = useI18n();
  const [payload, setPayload] = useState<PrayerTimesPayload | null>(null);

  useEffect(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    fetch(`/api/prayer-times/today?mosque_id=${DEMO_MOSQUE_ID}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setPayload)
      .catch(async () => {
        // Same offline-cache fallback as the countdown widget on this page,
        // so the full schedule list below it doesn't show "—" for every
        // prayer just because the network briefly failed.
        const cached =
          (await getCachedPrayerPayload(DEMO_MOSQUE_ID, todayStr)) ??
          (await getMostRecentCachedPayload(DEMO_MOSQUE_ID));
        if (cached) setPayload(cached.payload as PrayerTimesPayload);
      });
  }, []);

  const prayers: Array<{ code: string; label: string }> = [
    { code: "fajr", label: dict.prayers.fajr },
    { code: "dhuhr", label: payload?.isJumuah ? dict.home.jumuah : dict.prayers.dhuhr },
    { code: "asr", label: dict.prayers.asr },
    { code: "maghrib", label: dict.prayers.maghrib },
    { code: "isha", label: dict.prayers.isha },
  ];

  return (
    <div className="min-h-screen bg-sand pb-24">
      <header className="px-5 pt-6 pb-2 text-center">
        <h1 className="font-display text-2xl">{dict.prayerPage.title}</h1>
      </header>

      <main className="max-w-md mx-auto px-5">
        <section className="py-4">
          <PrayerCountdownWidget mosqueId={DEMO_MOSQUE_ID} />
        </section>

        <h2 className="text-base font-medium text-ink/60 mb-3">{dict.prayerPage.fullSchedule}</h2>
        <div className="bg-card rounded-2xl divide-y divide-sand-dark">
          {prayers.map((p) => (
            <div key={p.code} className="flex items-center justify-between p-4">
              <span className="font-display text-lg">{p.label}</span>
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="text-xs text-ink/60 mb-0.5">{dict.prayerPage.adhan}</p>
                  <p className="tabular-nums">{payload?.adhan[p.code]?.substring(0, 5) ?? "—"}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-ink/60 mb-0.5">{dict.prayerPage.iqama}</p>
                  <p className="tabular-nums font-medium">{payload?.iqama?.[p.code]?.substring(0, 5) ?? "—"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <FooterNav />
    </div>
  );
}
