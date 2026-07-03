'use client';

/**
 * Prayer page — same design language as home:
 * emerald hero with large radial countdown ring (Adhan outer arc, Iqama inner arc),
 * date chips, then a full-day schedule of prayer rows with Adhan + Iqama columns,
 * Jumu'ah labeled distinctly on Fridays, notification bell toggle per prayer.
 */

import { useEffect, useMemo, useState } from 'react';
import BottomNav from '@/components/BottomNav';

interface PrayerRow { adhan: string; iqama?: string; }
interface DayTimes {
  fajr: PrayerRow; dhuhr: PrayerRow; asr: PrayerRow; maghrib: PrayerRow; isha: PrayerRow;
  sunrise?: string; sunset?: string;
  hijri?: string;
}

const ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
const LABELS: Record<string, string> = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };
const ICONS: Record<string, string> = { fajr: '🌙', dhuhr: '☀️', asr: '⛅', maghrib: '🌅', isha: '🌘' };

function toSec(t: string) { const [h, m] = t.split(':').map(Number); return h * 3600 + m * 60; }
function fmt12(t?: string) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export default function PrayerPage() {
  const [day, setDay] = useState<DayTimes | null>(null);
  const [tick, setTick] = useState(0);
  const [muted, setMuted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch('/api/prayer-times/today?detail=full')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d?.day && setDay(d.day))
      .catch(() => {});
  }, []);

  const isFriday = new Date().getDay() === 5;

  // ── Countdown to next Adhan + next Iqama ────────────────────────────────
  const next = useMemo(() => {
    if (!day) return null;
    const now = new Date();
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    for (const p of ORDER) {
      const row = day[p];
      if (!row?.adhan) continue;
      const adhanSec = toSec(row.adhan);
      const iqamaSec = row.iqama ? toSec(row.iqama) : null;

      const target = iqamaSec && iqamaSec > nowSec ? iqamaSec : adhanSec;
      if (target > nowSec || (iqamaSec && iqamaSec > nowSec)) {
        const idx = ORDER.indexOf(p);
        const prev = idx > 0 ? toSec(day[ORDER[idx - 1]].adhan) : 0;

        const adhanRemain = Math.max(0, adhanSec - nowSec);
        const iqamaRemain = iqamaSec ? Math.max(0, iqamaSec - nowSec) : null;

        const span = adhanSec - prev || 1;
        const adhanPct = Math.min(100, Math.max(0, ((nowSec - prev) / span) * 100));
        const iqamaPct = iqamaSec
          ? Math.min(100, Math.max(0, ((nowSec - adhanSec) / (iqamaSec - adhanSec || 1)) * 100))
          : 0;

        const fmt = (s: number) => {
          const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
          return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
        };

        const showingIqama = adhanRemain === 0 && iqamaRemain !== null && iqamaRemain > 0;
        const remaining = showingIqama ? iqamaRemain! : adhanRemain;
        const urgent = remaining < 600; // <10 min — color shift

        return {
          key: p,
          name: isFriday && p === 'dhuhr' ? "Jumu'ah" : LABELS[p],
          phase: showingIqama ? 'Iqama' : 'Adhan',
          countdown: fmt(remaining),
          adhanPct: Math.round(adhanPct),
          iqamaPct: Math.round(iqamaPct),
          urgent,
          adhanTime: row.adhan,
          iqamaTime: row.iqama,
        };
      }
    }
    return {
      key: 'fajr', name: 'Fajr', phase: 'Adhan', countdown: '—',
      adhanPct: 100, iqamaPct: 0, urgent: false,
      adhanTime: day.fajr.adhan, iqamaTime: day.fajr.iqama,
    };
  }, [day, tick, isFriday]);

  const gregorian = new Date().toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  // Ring geometry — outer (Adhan) + inner (Iqama), per widget spec
  const RO = 62, RI = 48;
  const CO = 2 * Math.PI * RO, CI = 2 * Math.PI * RI;

  return (
    <main className="prayer">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="p-hero">
        <h1 className="p-hero__title">Prayer Times</h1>
        <div className="p-hero__chips">
          <span className="p-chip">📅 {gregorian}</span>
          {day?.hijri && <span className="p-chip" dir="rtl">🌙 {day.hijri}</span>}
        </div>

        <div className={`p-ring ${next?.urgent ? 'p-ring--urgent' : ''}`}>
          <svg viewBox="0 0 150 150" width="190" height="190">
            {/* Outer track + arc — Adhan */}
            <circle cx="75" cy="75" r={RO} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
            <circle
              cx="75" cy="75" r={RO} fill="none"
              stroke="url(#adhanGrad)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={CO} strokeDashoffset={CO - (CO * (next?.adhanPct ?? 0)) / 100}
              transform="rotate(-90 75 75)"
            />
            {/* Inner track + arc — Iqama */}
            <circle cx="75" cy="75" r={RI} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
            <circle
              cx="75" cy="75" r={RI} fill="none"
              stroke="url(#iqamaGrad)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={CI} strokeDashoffset={CI - (CI * (next?.iqamaPct ?? 0)) / 100}
              transform="rotate(-90 75 75)"
            />
            <defs>
              <linearGradient id="adhanGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f4d58d" />
                <stop offset="100%" stopColor="#74c69d" />
              </linearGradient>
              <linearGradient id="iqamaGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a7d8f0" />
                <stop offset="100%" stopColor="#74c69d" />
              </linearGradient>
            </defs>
          </svg>
          <div className="p-ring__center">
            <span className="p-ring__phase">{next?.phase} in</span>
            <span className="p-ring__name">{next?.name ?? '—'}</span>
            <span className="p-ring__count">{next?.countdown ?? '--:--:--'}</span>
          </div>
        </div>

        <div className="p-hero__legend">
          <span><i className="dot dot--adhan" /> Adhan {fmt12(next?.adhanTime)}</span>
          {next?.iqamaTime && <span><i className="dot dot--iqama" /> Iqama {fmt12(next.iqamaTime)}</span>}
        </div>

        {(day?.sunrise || day?.sunset) && (
          <div className="p-hero__sun">
            {day.sunrise && <span>🌅 Sunrise {fmt12(day.sunrise)}</span>}
            {day.sunset && <span>🌇 Sunset {fmt12(day.sunset)}</span>}
          </div>
        )}
      </header>

      {/* ── Schedule ─────────────────────────────────────────────────── */}
      <section className="sched" aria-label="Today's prayer schedule">
        <div className="sched__header">
          <span className="sched__col-name">Prayer</span>
          <span className="sched__col">Adhan</span>
          <span className="sched__col">Iqama</span>
          <span className="sched__col-bell" aria-hidden="true" />
        </div>

        {ORDER.map(p => {
          const row = day?.[p];
          const isNext = next?.key === p;
          const label = isFriday && p === 'dhuhr' ? "Jumu'ah" : LABELS[p];
          const isMuted = muted[p];
          return (
            <div key={p} className={`sched__row ${isNext ? 'sched__row--next' : ''} ${isFriday && p === 'dhuhr' ? 'sched__row--jumuah' : ''}`}>
              <span className="sched__name">
                <span className="sched__icon">{ICONS[p]}</span>
                {label}
                {isNext && <em className="sched__badge">Next</em>}
              </span>
              <span className="sched__time">{fmt12(row?.adhan)}</span>
              <span className="sched__time sched__time--iqama">{fmt12(row?.iqama)}</span>
              <button
                className={`sched__bell ${isMuted ? 'sched__bell--off' : ''}`}
                onClick={() => setMuted(m => ({ ...m, [p]: !m[p] }))}
                aria-label={`${isMuted ? 'Enable' : 'Mute'} ${label} notification`}
                aria-pressed={!isMuted}
              >
                {isMuted ? '🔕' : '🔔'}
              </button>
            </div>
          );
        })}
      </section>

      <BottomNav active="prayer" />

      <style>{styles}</style>
    </main>
  );
}

const styles = `
.prayer {
  background: #faf7f2;
  min-height: 100vh;
  padding-bottom: 96px;
  font-family: ui-sans-serif, -apple-system, 'Segoe UI', sans-serif;
  color: #16211c;
}

/* ── Hero ── */
.p-hero {
  background: linear-gradient(160deg, #1b4332 0%, #2d6a4f 100%);
  border-radius: 0 0 32px 32px;
  padding: 1.25rem 1.25rem 1.75rem;
  color: #fff;
  text-align: center;
  box-shadow: 0 14px 30px rgba(27,67,50,0.3);
}
.p-hero__title {
  font-family: 'Iowan Old Style', 'Palatino', Georgia, serif;
  font-size: 1.6rem; margin: 0.25rem 0 0.75rem; font-weight: 700;
}
.p-hero__chips { display: flex; justify-content: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
.p-chip {
  background: rgba(255,255,255,0.14);
  border-radius: 999px; padding: 0.4rem 0.9rem;
  font-size: 0.78rem;
}

/* ── Dual ring ── */
.p-ring { position: relative; width: 190px; height: 190px; margin: 0 auto; }
.p-ring__center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.1rem;
}
.p-ring__phase { font-size: 0.75rem; opacity: 0.85; }
.p-ring__name {
  font-family: 'Iowan Old Style', 'Palatino', Georgia, serif;
  font-size: 1.5rem; font-weight: 700;
}
.p-ring__count {
  font-size: 1.35rem; font-weight: 700;
  font-variant-numeric: tabular-nums; letter-spacing: 0.02em;
}
.p-ring--urgent .p-ring__count { color: #f4d58d; }
@keyframes pulseRing { 0%,100% { transform: scale(1); } 50% { transform: scale(1.02); } }
.p-ring--urgent { animation: pulseRing 2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .p-ring--urgent { animation: none; } }

.p-hero__legend {
  display: flex; justify-content: center; gap: 1.25rem;
  margin-top: 1rem; font-size: 0.78rem;
}
.dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; }
.dot--adhan { background: #f4d58d; }
.dot--iqama { background: #a7d8f0; }
.p-hero__sun {
  display: flex; justify-content: center; gap: 1.25rem;
  margin-top: 0.6rem; font-size: 0.75rem; opacity: 0.9;
}

/* ── Schedule ── */
.sched {
  margin: 1.25rem; background: #fff;
  border-radius: 22px; overflow: hidden;
  box-shadow: 0 4px 18px rgba(0,0,0,0.06);
}
.sched__header, .sched__row {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 48px;
  align-items: center;
  padding: 0.9rem 1rem;
}
.sched__header {
  font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: #6b7671;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.sched__col, .sched__col-name { text-align: left; }
.sched__row { border-bottom: 1px solid rgba(0,0,0,0.05); min-height: 60px; }
.sched__row:last-child { border-bottom: none; }
.sched__row--next { background: #eef7f1; }
.sched__row--jumuah .sched__name { color: #1b4332; }
.sched__row--jumuah .sched__icon { filter: hue-rotate(90deg); }
.sched__name {
  display: flex; align-items: center; gap: 0.5rem;
  font-weight: 700; font-size: 0.9375rem;
}
.sched__icon { font-size: 1.1rem; }
.sched__badge {
  background: #1b4332; color: #fff; font-style: normal;
  font-size: 0.625rem; font-weight: 700;
  border-radius: 999px; padding: 0.15rem 0.5rem;
}
.sched__time { font-size: 0.875rem; font-variant-numeric: tabular-nums; }
.sched__time--iqama { color: #2d6a4f; font-weight: 600; }
.sched__bell {
  width: 40px; height: 40px; border-radius: 50%;
  border: none; background: #f2efe9; cursor: pointer; font-size: 1rem;
}
.sched__bell--off { opacity: 0.45; }
`;
