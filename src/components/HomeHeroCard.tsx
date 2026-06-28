"use client";

import { useEffect, useState } from "react";
import { Menu, Bell } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { usePrayerTimes } from "@/lib/hooks/usePrayerTimes";
import { formatCountdown } from "@/lib/prayerTime";
import WeatherIcon from "@/components/WeatherIcon";
import type { WeatherIconName } from "@/lib/weatherCodes";

interface Props {
  mosqueId: string;
  mosqueName: string;
  coverImageUrl: string | null;
  greeting: string;
  dateLabel: string;
  hijriLabel: string;
  unreadNotificationCount?: number;
  onMenuClick?: () => void;
}

interface WeatherData {
  temperatureC: number;
  icon: WeatherIconName;
  labelKey: string;
}

/**
 * The Home Screen hero: greeting + mosque name + date pills + weather over
 * a cover photo, with an embedded compact "Next Prayer" countdown panel.
 * This compact countdown intentionally duplicates the larger standalone
 * ring further down the page (see usePrayerTimes — both read the same
 * underlying data so they can never disagree) since the reference design
 * treats the hero version as an at-a-glance summary and the lower one as
 * the focused, full-attention countdown.
 */
export default function HomeHeroCard({
  mosqueId,
  mosqueName,
  coverImageUrl,
  greeting,
  dateLabel,
  hijriLabel,
  unreadNotificationCount = 0,
  onMenuClick,
}: Props) {
  const { dict } = useI18n();
  const { nextEvent, countdownLabel, now } = usePrayerTimes(mosqueId);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    fetch(`/api/weather?mosque_id=${mosqueId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.temperatureC === "number") setWeather(data);
      })
      .catch(() => {});
  }, [mosqueId]);

  const weatherConditions = dict.home.weather.conditions as Record<string, string>;
  const adhanTimeLabel = nextEvent
    ? nextEvent.at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div
      className="relative overflow-hidden rounded-[var(--radius-card)] shadow-card min-h-[280px] flex flex-col justify-between"
      style={{
        backgroundImage: coverImageUrl
          ? `linear-gradient(180deg, rgba(17,77,68,0.55) 0%, rgba(17,77,68,0.75) 100%), url(${coverImageUrl})`
          : "linear-gradient(135deg, #114d44 0%, #1e6a5d 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Top row: menu + notification bell */}
      <div className="flex items-center justify-between p-5">
        <button
          onClick={onMenuClick}
          aria-label={dict.common.menu}
          className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          aria-label={dict.common.notifications}
          className="relative w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white"
        >
          <Bell className="w-5 h-5" />
          {unreadNotificationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-urgent text-white text-[10px] font-bold flex items-center justify-center">
              {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
            </span>
          )}
        </button>
      </div>

      {/* Greeting + mosque name */}
      <div className="px-5">
        <p className="text-white/90 text-sm flex items-center gap-1.5">{greeting} 👋</p>
        <h1 className="font-display text-white text-[28px] leading-tight font-bold mt-1">{mosqueName}</h1>
      </div>

      {/* Date pills + weather */}
      <div className="px-5 mt-3 flex items-center gap-2 flex-wrap">
        <span className="bg-white/15 backdrop-blur-sm text-white text-xs rounded-full px-3 py-1.5">{dateLabel}</span>
        <span className="bg-white/15 backdrop-blur-sm text-white text-xs rounded-full px-3 py-1.5">{hijriLabel}</span>
      </div>

      {weather && (
        <div className="px-5 mt-2 flex items-center gap-1.5 text-white/90 text-sm">
          <WeatherIcon name={weather.icon} className="w-4 h-4" />
          <span>{weather.temperatureC}°C</span>
          <span className="text-white/70">·</span>
          <span>{weatherConditions[weather.labelKey] ?? weather.labelKey}</span>
        </div>
      )}

      {/* Embedded compact Next Prayer panel */}
      {nextEvent && (
        <div className="m-4 mt-4 rounded-2xl bg-night-teal/90 backdrop-blur-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs">{dict.home.nextPrayer}</p>
            <p className="text-white font-display text-xl font-bold mt-0.5">{nextEvent.label}</p>
            <p className="text-gold-light font-display text-2xl font-bold tabular-nums mt-0.5">{countdownLabel}</p>
            {adhanTimeLabel && (
              <p className="text-white/70 text-xs mt-0.5">
                {adhanTimeLabel} ({nextEvent.type === "adhan" ? dict.prayerPage.adhan : dict.prayerPage.iqama})
              </p>
            )}
          </div>
          <MiniRing progress={computeMiniProgress(now, nextEvent.at)} />
        </div>
      )}
    </div>
  );
}

/** A small ring (not the full detailed ring used lower on the page) just
 * to echo the countdown visually in the compact hero panel. */
function MiniRing({ progress }: { progress: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="flex-shrink-0">
      <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={radius}
        fill="none"
        stroke="var(--color-gold-light)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
        className="transition-[stroke-dashoffset] duration-1000 ease-linear"
      />
    </svg>
  );
}

/** Rough visual progress for the mini ring — not trying to track an exact
 * "since-previous-prayer" window here (that's what the larger ring below
 * does properly); this is a lighter approximation scoped to a 3-hour
 * lookback window purely for the small glanceable indicator. */
function computeMiniProgress(now: Date, eventAt: Date): number {
  const windowMs = 3 * 60 * 60 * 1000;
  const remaining = eventAt.getTime() - now.getTime();
  return Math.min(1, Math.max(0, 1 - remaining / windowMs));
}
