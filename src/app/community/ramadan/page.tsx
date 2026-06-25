"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Moon } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface RamadanDay {
  id: string;
  islamic_day: number;
  gregorian_date: string;
  suhoor_end: string;
  iftar_time: string;
  taraweeh_time: string | null;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export default function RamadanSchedulePage() {
  const router = useRouter();
  const { dict, language } = useI18n();
  const [days, setDays] = useState<RamadanDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ramadan-schedule")
      .then((res) => res.json())
      .then((data) => setDays(data.days ?? []))
      .finally(() => setLoading(false));
  }, []);

  const locale = language === "ar" ? "ar" : language === "ur" ? "ur" : "en-US";
  const todayStr = new Date().toISOString().substring(0, 10);

  return (
    <div className="min-h-screen bg-sand pb-24">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button onClick={() => router.back()} aria-label={dict.ramadanPage.back} className="text-ink/60 hover:text-ink p-1">
          <ChevronLeft className="w-7 h-7 rtl:rotate-180" />
        </button>
        <h1 className="font-display text-xl">{dict.ramadanPage.title}</h1>
      </header>

      <main className="max-w-md mx-auto px-5">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-16 rounded-xl bg-white/60 animate-pulse" />
            ))}
          </div>
        ) : days.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Moon className="w-10 h-10 text-ink/30" />
            <p className="text-ink/60 text-lg">{dict.ramadanPage.notPublished}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {days.map((day) => {
              const isToday = day.gregorian_date === todayStr;
              return (
                <div
                  key={day.id}
                  className={`rounded-2xl p-4 ${isToday ? "bg-night-teal text-sand" : "bg-white"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-display text-lg ${isToday ? "text-sand" : ""}`}>
                      {dict.ramadanPage.day} {day.islamic_day} <span className="text-sm opacity-60">{dict.ramadanPage.of30}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {isToday && (
                        <span className="text-xs bg-gold text-ink px-2 py-0.5 rounded-full font-medium">
                          {dict.ramadanPage.today}
                        </span>
                      )}
                      <span className={`text-xs ${isToday ? "text-sand/60" : "text-ink/40"}`}>
                        {new Date(day.gregorian_date + "T12:00:00Z").toLocaleDateString(locale, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className={`text-xs ${isToday ? "text-sand/60" : "text-ink/40"}`}>{dict.ramadanPage.suhoorEnds}</p>
                      <p className="tabular-nums font-medium">{day.suhoor_end.substring(0, 5)}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${isToday ? "text-sand/60" : "text-ink/40"}`}>{dict.ramadanPage.iftar}</p>
                      <p className="tabular-nums font-medium">{day.iftar_time.substring(0, 5)}</p>
                    </div>
                    {day.taraweeh_time && (
                      <div>
                        <p className={`text-xs ${isToday ? "text-sand/60" : "text-ink/40"}`}>{dict.ramadanPage.taraweeh}</p>
                        <p className="tabular-nums font-medium">{day.taraweeh_time.substring(0, 5)}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
