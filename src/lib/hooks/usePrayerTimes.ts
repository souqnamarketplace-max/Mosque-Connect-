"use client";

import { useEffect, useState, useCallback } from "react";
import { PrayerTimesPayload, getNextEvent, formatCountdown, NextEvent, PrayerCode } from "@/lib/prayerTime";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cachePrayerPayload, getCachedPrayerPayload, getMostRecentCachedPayload } from "@/lib/offline/prayerCache";

export type PrayerDataState = "loading" | "ready" | "error";

export interface UsePrayerTimesResult {
  payload: PrayerTimesPayload | null;
  state: PrayerDataState;
  now: Date;
  nextEvent: NextEvent | null;
  countdownLabel: string;
  isOffline: boolean;
  staleSince: string | null;
}

export function usePrayerTimes(mosqueId: string): UsePrayerTimesResult {
  const { dict } = useI18n();
  const [payload, setPayload] = useState<PrayerTimesPayload | null>(null);
  const [state, setState] = useState<PrayerDataState>("loading");
  const [now, setNow] = useState(new Date());
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
      cachePrayerPayload(mosqueId, todayStr, data);
    } catch {
      const todayCache = await getCachedPrayerPayload(mosqueId, todayStr);
      if (todayCache) {
        setPayload(todayCache.payload as PrayerTimesPayload);
        setState("ready");
        setIsOffline(true);
        setStaleSince(null);
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

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!payload) return;
    const todayStr = new Date().toISOString().substring(0, 10);
    if (payload.date !== todayStr) fetchPayload();
  }, [now, payload, fetchPayload]);

  const nextEvent = payload ? getNextEvent(payload, now, prayerLabels, dict.home.jumuah) : null;
  const countdownLabel = nextEvent ? formatCountdown(nextEvent.at.getTime() - now.getTime()) : "—";

  return { payload, state, now, nextEvent, countdownLabel, isOffline, staleSince };
}
