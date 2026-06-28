"use client";

import { useEffect, useState, useCallback } from "react";
import { PrayerTimesPayload, getNextEvent, formatCountdown, PrayerCode } from "@/lib/prayerTime";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cachePrayerPayload, getCachedPrayerPayload, getMostRecentCachedPayload } from "@/lib/offline/prayerCache";
import { WifiOff, Landmark } from "lucide-react";

interface Props {
  mosqueId: string;
}

const RADIUS_OUTER = 110;
const RADIUS_INNER = 84;
const STROKE = 14;
const CIRCUMFERENCE_OUTER = 2 * Math.PI * RADIUS_OUTER;
const CIRCUMFERENCE_INNER = 2 * Math.PI * RADIUS_INNER;

type WidgetState = "loading" | "ready" | "error";

export default function PrayerCountdownWidget({ mosqueId }: Props) {
  const { dict } = useI18n();
  const [payload, setPayload] = useState<PrayerTimesPayload | null>(null);
  const [state, setState] = useState<WidgetState>("loading");
  const [now, setNow] = useState(new Date());
  const [expanded, setExpanded] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [staleSince, setStaleSince] = useState<string | null>(null);

  const prayerLabels: Record<PrayerCode, string> = {
    fajr: dict.prayers.fajr,
    dhuhr: dict.prayers.dhuhr,
    asr: dict.prayers.asr,
    maghrib: dict.prayers.maghrib,
    isha: dict.prayers.isha,
  };

  const fetchPayload = useCallback(async () => {
    setState("loading");
    const todayStr = new Date().toISOString().substring(0, 10);

    try {
      const res = await fetch(`/api/prayer-times/today?mosque_id=${mosqueId}`);
      if (!res.ok) throw new Error("fetch failed");
      const data: PrayerTimesPayload = await res.json();
      setPayload(data);
      setState("ready");
      setIsOffline(false);
      setStaleSince(null);
      // Cache on every successful fetch so this exact day's schedule is
      // available offline later, including for the rest of today.
      cachePrayerPayload(mosqueId, todayStr, data);
    } catch {
      // Network (or server) failed — try today's cache first, then fall
      // back to whatever was most recently cached for this mosque at all,
      // rather than immediately giving up and showing "unavailable."
      const todayCache = await getCachedPrayerPayload(mosqueId, todayStr);
      if (todayCache) {
        setPayload(todayCache.payload as PrayerTimesPayload);
        setState("ready");
        setIsOffline(true);
        setStaleSince(null); // same-day cache isn't "stale" in the sense that matters, just offline
        return;
      }
      const fallback = await getMostRecentCachedPayload(mosqueId);
      if (fallback) {
        setPayload(fallback.payload as PrayerTimesPayload);
        setState("ready");
        setIsOffline(true);
        setStaleSince(fallback.date);
        return;
      }
      setState("error");
    }
  }, [mosqueId]);

  useEffect(() => {
    fetchPayload();
  }, [fetchPayload]);

  // Tick every second; also re-fetch at local midnight rollover.
  useEffect(() => {
    const interval = setInterval(() => {
      const newNow = new Date();
      setNow((prevNow) => {
        if (newNow.getDate() !== prevNow.getDate()) {
          fetchPayload();
        }
        return newNow;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchPayload]);

  if (state === "loading") {
    return (
      <div className="flex justify-center py-8">
        <div
          className="w-64 h-64 rounded-full border-[14px] border-sand-dark animate-pulse"
          aria-label="Loading prayer times"
        />
      </div>
    );
  }

  if (state === "error" || !payload) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="text-ink/70">{dict.home.prayerUnavailable}</p>
        <button
          onClick={fetchPayload}
          className="px-4 py-2 rounded-full bg-night-teal text-sand text-sm font-medium hover:bg-night-teal-light transition-colors"
        >
          {dict.common.retry}
        </button>
      </div>
    );
  }

  const nextEvent = getNextEvent(payload, now, prayerLabels, dict.home.jumuah);

  if (!nextEvent) {
    return (
      <div className="text-center py-10 text-ink/70">
        {dict.home.noMorePrayers}
      </div>
    );
  }

  // Determine the "dominant" countdown: if the next event is an Iqama (i.e. we are
  // between an Adhan and its Iqama), the inner ring is dominant; otherwise the
  // outer ring (counting to the next Adhan) is dominant and the inner ring is hidden.
  const isIqamaDominant = nextEvent.type === "iqama";

  // For the outer (Adhan) ring: find the most recent past Adhan and the next Adhan,
  // to compute elapsed progress even when Iqama is dominant.
  const allAdhanTimes = (["fajr", "dhuhr", "asr", "maghrib", "isha"] as const).map((p) => ({
    prayer: p,
    at: new Date(`${payload.date}T${payload.adhan[p]}Z`),
  }));
  const nextAdhan = allAdhanTimes.find((e) => e.at.getTime() > now.getTime()) ?? allAdhanTimes[allAdhanTimes.length - 1];
  const prevAdhanIndex = allAdhanTimes.findIndex((e) => e.prayer === nextAdhan.prayer) - 1;
  const prevAdhan = prevAdhanIndex >= 0 ? allAdhanTimes[prevAdhanIndex] : null;

  const outerTotalMs = prevAdhan ? nextAdhan.at.getTime() - prevAdhan.at.getTime() : 4 * 60 * 60 * 1000;
  const outerElapsedMs = prevAdhan ? now.getTime() - prevAdhan.at.getTime() : 0;
  const outerProgress = isIqamaDominant ? 1 : Math.min(1, Math.max(0, outerElapsedMs / outerTotalMs));

  const msRemaining = nextEvent.at.getTime() - now.getTime();
  const dominantTotalMs = isIqamaDominant
    ? nextEvent.at.getTime() - (prevAdhan ? nextAdhan.at.getTime() - (nextAdhan.at.getTime() - now.getTime()) : 0)
    : outerTotalMs;
  const innerProgress = isIqamaDominant
    ? Math.min(1, Math.max(0, 1 - msRemaining / Math.max(dominantTotalMs, 1)))
    : 0;

  const isUrgent = msRemaining < 10 * 60 * 1000;
  const isCritical = msRemaining < 60 * 1000;
  const ringColor = isCritical ? "var(--color-urgent)" : isUrgent ? "var(--color-gold)" : "var(--color-night-teal)";

  const outerDashoffset = CIRCUMFERENCE_OUTER * (1 - outerProgress);
  const innerDashoffset = CIRCUMFERENCE_INNER * (1 - innerProgress);

  return (
    <div className="flex flex-col items-center">
      {isOffline && (
        <div className="flex items-center gap-1.5 text-xs text-ink-secondary bg-sand-dark/40 px-3 py-1 rounded-full mb-3">
          <WifiOff className="w-3 h-3" />
          {staleSince ? `${dict.home.offlineShowingStale} ${staleSince}` : dict.home.offlineShowingToday}
        </div>
      )}
      <button
        onClick={() => setExpanded(true)}
        className="relative w-64 h-64 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-full bg-card shadow-card"
        aria-label="View full prayer schedule"
      >
        <svg width="256" height="256" viewBox="0 0 256 256" className="-rotate-90">
          <circle cx="128" cy="128" r={RADIUS_OUTER} fill="none" stroke="var(--color-sand-dark)" strokeWidth={STROKE} />
          <circle
            cx="128"
            cy="128"
            r={RADIUS_OUTER}
            fill="none"
            stroke={ringColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE_OUTER}
            strokeDashoffset={outerDashoffset}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
          {isIqamaDominant && (
            <circle
              cx="128"
              cy="128"
              r={RADIUS_INNER}
              fill="none"
              stroke="var(--color-sage)"
              strokeWidth={STROKE * 0.6}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE_INNER}
              strokeDashoffset={innerDashoffset}
              opacity={0.6}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-night-teal/10 flex items-center justify-center mb-2">
            <Landmark className="w-5 h-5 text-night-teal" />
          </div>
          <span className="text-xs text-ink-secondary uppercase tracking-wide">{dict.home.timeRemaining}</span>
          <span className="font-display text-4xl font-bold tabular-nums mt-1" style={{ color: ringColor }}>
            {formatCountdown(msRemaining)}
          </span>
          <span className="text-sm text-ink mt-1">
            {nextEvent.type === "adhan" ? dict.home.untilAdhan : dict.home.untilIqama} {nextEvent.label}
          </span>
        </div>
      </button>

      {expanded && (
        <ScheduleSheet
          payload={payload}
          nextEvent={nextEvent}
          prayerLabels={prayerLabels}
          jumuahLabel={dict.home.jumuah}
          scheduleTitle={dict.home.todaysSchedule}
          khutbahLabel={dict.home.khutbahBegins}
          onClose={() => setExpanded(false)}
        />
      )}
    </div>
  );
}

function ScheduleSheet({
  payload,
  nextEvent,
  prayerLabels,
  jumuahLabel,
  scheduleTitle,
  khutbahLabel,
  onClose,
}: {
  payload: PrayerTimesPayload;
  nextEvent: NonNullable<ReturnType<typeof getNextEvent>>;
  prayerLabels: Record<PrayerCode, string>;
  jumuahLabel: string;
  scheduleTitle: string;
  khutbahLabel: string;
  onClose: () => void;
}) {
  const prayers: Array<{ code: PrayerCode; label: string }> = [
    { code: "fajr", label: prayerLabels.fajr },
    { code: "dhuhr", label: payload.isJumuah ? jumuahLabel : prayerLabels.dhuhr },
    { code: "asr", label: prayerLabels.asr },
    { code: "maghrib", label: prayerLabels.maghrib },
    { code: "isha", label: prayerLabels.isha },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40" onClick={onClose}>
      <div
        className="w-full max-w-md bg-sand rounded-t-3xl p-6 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-sand-dark rounded-full mx-auto mb-5" />
        <h2 className="font-display text-xl mb-4">{scheduleTitle}</h2>
        <div className="space-y-2">
          {prayers.map((p) => {
            const isCurrent = nextEvent.prayer === p.code;
            return (
              <div
                key={p.code}
                className={`flex items-center justify-between py-2.5 px-3 rounded-xl ${
                  isCurrent ? "bg-night-teal/10 border border-night-teal/30" : ""
                }`}
              >
                <span className={`font-display ${isCurrent ? "text-night-teal font-semibold" : ""}`}>{p.label}</span>
                <div className="flex gap-6 text-sm tabular-nums">
                  <span className="text-ink/60">{payload.adhan[p.code]?.substring(0, 5)}</span>
                  <span className="font-medium">{payload.iqama?.[p.code]?.substring(0, 5) ?? "—"}</span>
                </div>
              </div>
            );
          })}
        </div>
        {payload.isJumuah && payload.khutbahTime && (
          <p className="text-xs text-ink/60 mt-3">{khutbahLabel} {payload.khutbahTime.substring(0, 5)}</p>
        )}
      </div>
    </div>
  );
}
