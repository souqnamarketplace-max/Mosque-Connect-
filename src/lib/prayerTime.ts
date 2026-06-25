export interface PrayerTimesPayload {
  date: string;
  timezone: string;
  adhan: {
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  iqama: {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  } | null;
  isJumuah: boolean;
  khutbahTime: string | null;
}

export type PrayerCode = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export interface NextEvent {
  prayer: PrayerCode;
  type: "adhan" | "iqama";
  at: Date;
  label: string;
}

/**
 * Combines a today-payload's HH:MM:SS time string with the payload's date
 * into an absolute Date, in the mosque's timezone-correct UTC instant.
 * Times are stored/returned as plain TIME values representing the mosque's
 * local wall-clock time on `date`; since we don't have a reliable
 * cross-platform local "construct a date in timezone X" primitive without a
 * heavier date library, we approximate by treating the stored values as
 * already being absolute UTC instants produced by the calculation engine
 * (see prayerCalculation.ts toTimeString, which intentionally stores UTC).
 */
function combineDateAndTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}Z`);
}

/**
 * Builds the full ordered list of Adhan + Iqama events for the day,
 * inserting the Jumu'ah relabeling where applicable, and returns the
 * single next chronological event relative to `now`.
 */
export function getNextEvent(
  payload: PrayerTimesPayload,
  now: Date,
  prayerLabels: Record<PrayerCode, string>,
  jumuahLabel: string
): NextEvent | null {
  const events: NextEvent[] = [];
  const prayers: PrayerCode[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

  for (const prayer of prayers) {
    const isJumuahSlot = payload.isJumuah && prayer === "dhuhr";
    const label = isJumuahSlot ? jumuahLabel : prayerLabels[prayer];

    events.push({
      prayer,
      type: "adhan",
      at: combineDateAndTime(payload.date, payload.adhan[prayer]),
      label,
    });

    if (payload.iqama) {
      events.push({
        prayer,
        type: "iqama",
        at: combineDateAndTime(payload.date, payload.iqama[prayer]),
        label,
      });
    }
  }

  const future = events.filter((e) => e.at.getTime() > now.getTime()).sort((a, b) => a.at.getTime() - b.at.getTime());
  return future[0] ?? null;
}

export function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
