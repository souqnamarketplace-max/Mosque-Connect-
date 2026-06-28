"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronDown,
  Settings,
  Calendar,
  Sunrise,
  Sunset,
  Moon,
  Thermometer,
  Check,
  Bell,
  MoreVertical,
  Navigation,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import FooterNav from "@/components/FooterNav";
import WeatherIcon from "@/components/WeatherIcon";
import type { WeatherIconName } from "@/lib/weatherCodes";
import { usePrayerTimes } from "@/lib/hooks/usePrayerTimes";
import { calculateLastThirdOfNight } from "@/lib/prayerTime";
import { calculateQiblaBearing, calculateQiblaDistanceKm, bearingToCompassLabel } from "@/lib/qibla";
import { PRAYER_NAMES_ARABIC } from "@/lib/prayerNamesArabic";

interface Mosque {
  id: string;
  name: string;
  cover_image_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface WeatherData {
  temperatureC: number;
  icon: WeatherIconName;
  labelKey: string;
}

const PRAYER_CODES = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

export default function PrayerPage() {
  const router = useRouter();
  const { dict, language } = useI18n();
  const [mosque, setMosque] = useState<Mosque | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [view, setView] = useState<"today" | "monthly">("today");

  useEffect(() => {
    fetch("/api/mosques/current")
      .then((res) => (res.ok ? res.json() : null))
      .then(setMosque);
  }, []);

  const { payload, nextEvent, countdownLabel, now } = usePrayerTimes(mosque?.id ?? "");

  useEffect(() => {
    if (!mosque?.id) return;
    fetch(`/api/weather?mosque_id=${mosque.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.temperatureC === "number") setWeather(data);
      })
      .catch(() => {});
  }, [mosque?.id]);

  const weatherConditions = dict.home.weather.conditions as Record<string, string>;
  const locale = language === "ar" ? "ar" : language === "ur" ? "ur" : "en-US";

  const dateLabel = now.toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric", year: "numeric" });

  const lastThird =
    payload && payload.tomorrowFajr
      ? calculateLastThirdOfNight(payload.date, payload.adhan.maghrib, payload.tomorrowFajr)
      : null;

  const qiblaBearing =
    mosque?.latitude != null && mosque?.longitude != null
      ? calculateQiblaBearing(mosque.latitude, mosque.longitude)
      : null;
  const qiblaDistance =
    mosque?.latitude != null && mosque?.longitude != null
      ? calculateQiblaDistanceKm(mosque.latitude, mosque.longitude)
      : null;

  const prayerLabels: Record<(typeof PRAYER_CODES)[number], string> = {
    fajr: dict.prayers.fajr,
    dhuhr: payload?.isJumuah ? dict.home.jumuah : dict.prayers.dhuhr,
    asr: dict.prayers.asr,
    maghrib: dict.prayers.maghrib,
    isha: dict.prayers.isha,
  };

  return (
    <div className="min-h-screen bg-sand pb-28">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-5 pb-3 max-w-md mx-auto">
        <button
          onClick={() => router.back()}
          aria-label={dict.prayerPage.back}
          className="w-10 h-10 rounded-full bg-night-teal/10 flex items-center justify-center text-night-teal"
        >
          <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
        </button>
        <div className="text-center">
          <h1 className="font-display text-lg font-semibold">{dict.prayerPage.title}</h1>
          <button className="flex items-center gap-1 text-xs text-ink-secondary mx-auto mt-0.5">
            {mosque?.name ?? "—"} <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        <button
          aria-label={dict.common.settings}
          className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center text-gold"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      <main className="max-w-md mx-auto px-4">
        {/* Hero card with date, next prayer, countdown ring, cover photo */}
        <div
          className="relative overflow-hidden rounded-[var(--radius-card)] shadow-card p-5 min-h-[180px]"
          style={{
            backgroundImage: mosque?.cover_image_url
              ? `linear-gradient(90deg, rgba(17,77,68,0.92) 0%, rgba(17,77,68,0.55) 60%, rgba(17,77,68,0.25) 100%), url(${mosque.cover_image_url})`
              : "linear-gradient(135deg, #114d44 0%, #1e6a5d 100%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <p className="flex items-center gap-1.5 text-white/80 text-xs">
            <Calendar className="w-3.5 h-3.5" /> {dateLabel}
          </p>
          {nextEvent && (
            <>
              <p className="text-white/70 text-sm mt-3">{dict.home.nextPrayer}</p>
              <p className="font-display text-white text-2xl font-bold mt-0.5">{nextEvent.label}</p>
              <p className="font-display text-gold-light text-3xl font-bold tabular-nums mt-1">{countdownLabel}</p>
              <p className="text-white/70 text-xs mt-1">
                {nextEvent.at.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })} (
                {nextEvent.type === "adhan" ? dict.prayerPage.adhan : dict.prayerPage.iqama})
              </p>
            </>
          )}
        </div>

        {/* Stats strip: sunrise, sunset, last third, weather */}
        {payload && (
          <div className="bg-card rounded-2xl shadow-card mt-3 p-3 grid grid-cols-4 gap-2 text-center">
            <StatItem icon={<Sunrise className="w-4 h-4 text-gold" />} label={dict.prayerPage.sunrise} value={payload.adhan.sunrise.substring(0, 5)} />
            <StatItem icon={<Sunset className="w-4 h-4 text-urgent" />} label={dict.prayerPage.sunset} value={payload.adhan.maghrib.substring(0, 5)} />
            <StatItem
              icon={<Moon className="w-4 h-4 text-night-teal-light" />}
              label={dict.prayerPage.lastThird}
              value={lastThird ? lastThird.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" }) : "—"}
            />
            {weather ? (
              <StatItem
                icon={<WeatherIcon name={weather.icon} className="w-4 h-4 text-gold" />}
                label={`${weather.temperatureC}°C`}
                value={weatherConditions[weather.labelKey] ?? ""}
              />
            ) : (
              <StatItem icon={<Thermometer className="w-4 h-4 text-ink-secondary" />} label="—" value="" />
            )}
          </div>
        )}

        {/* Today / Monthly toggle */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => setView("today")}
            className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium ${
              view === "today" ? "bg-night-teal text-white" : "bg-card text-ink-secondary"
            }`}
          >
            <Calendar className="w-4 h-4" /> {dict.prayerPage.today}
          </button>
          <button
            onClick={() => setView("monthly")}
            className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium ${
              view === "monthly" ? "bg-night-teal text-white" : "bg-card text-ink-secondary"
            }`}
          >
            <Calendar className="w-4 h-4" /> {dict.prayerPage.monthlyView}
          </button>
        </div>

        {/* Prayer list */}
        {view === "today" && payload && (
          <div className="space-y-2.5 mt-4">
            {PRAYER_CODES.map((code) => {
              const isCurrent = nextEvent?.prayer === code;
              const adhanAt = new Date(`${payload.date}T${payload.adhan[code]}Z`);
              const isPast = adhanAt.getTime() < now.getTime() && !isCurrent;
              const arabicName = language === "ar" ? null : PRAYER_NAMES_ARABIC[code === "dhuhr" && payload.isJumuah ? "jumuah" : code];

              return (
                <div
                  key={code}
                  className={`relative rounded-2xl p-4 bg-card shadow-card ${
                    isCurrent ? "border-l-4 border-success bg-success/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-lg font-semibold">{prayerLabels[code]}</span>
                      {arabicName && <span className="font-arabic text-ink-secondary text-base">{arabicName}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {isCurrent && (
                        <span className="text-xs font-semibold text-success bg-success/10 px-2.5 py-1 rounded-full">
                          {dict.prayerPage.currentPrayer}
                        </span>
                      )}
                      {!isCurrent && (
                        <button aria-label="More options" className="text-ink-secondary p-1">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex gap-6 text-sm">
                      <div>
                        <p className="text-xs text-ink-secondary">{dict.prayerPage.adhan}</p>
                        <p className="tabular-nums font-medium">{payload.adhan[code].substring(0, 5)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-secondary">{dict.prayerPage.iqama}</p>
                        <p className="tabular-nums font-medium">{payload.iqama?.[code]?.substring(0, 5) ?? "—"}</p>
                      </div>
                      {isCurrent && (
                        <div>
                          <p className="text-xs text-ink-secondary">{dict.prayerPage.timeLeft}</p>
                          <p className="tabular-nums font-semibold text-success">{countdownLabel}</p>
                        </div>
                      )}
                    </div>
                    {!isCurrent && (
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isPast ? "bg-success/10 text-success" : "bg-sand-dark text-ink-secondary"
                        }`}
                      >
                        {isPast ? <Check className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "monthly" && (
          <div className="mt-6 text-center text-ink-secondary py-10">{dict.prayerPage.monthlyComingSoon}</div>
        )}

        {/* Qibla strip */}
        {qiblaBearing != null && qiblaDistance != null && (
          <button
            onClick={() => router.push("/qibla")}
            className="w-full flex items-center justify-between mt-4 mb-2 p-4 rounded-2xl bg-card shadow-card text-left"
          >
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-ink-secondary">{dict.qiblaStrip.direction}</p>
                <p className="font-medium">
                  {Math.round(qiblaBearing)}° {bearingToCompassLabel(qiblaBearing)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-secondary">{dict.qiblaStrip.distance}</p>
                <p className="font-medium">{Math.round(qiblaDistance).toLocaleString()} km</p>
              </div>
            </div>
            <span className="w-10 h-10 rounded-full bg-night-teal/10 flex items-center justify-center text-night-teal">
              <Navigation className="w-4 h-4" />
            </span>
          </button>
        )}
      </main>

      <FooterNav />
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {icon}
      <span className="text-[10px] text-ink-secondary leading-tight">{label}</span>
      <span className="text-xs font-medium tabular-nums leading-tight">{value}</span>
    </div>
  );
}
