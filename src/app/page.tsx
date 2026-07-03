'use client';

/**
 * Home page — matches approved mockup:
 * greeting → mosque name (serif) → location → date chips (Gregorian + Hijri)
 * → weather → hero mosque image → Next Prayer emerald card with radial
 * countdown ring + sunrise/sunset → 4 feature cards → Daily Dua card
 * → Upcoming Prayers timeline → announcement banner → bottom nav.
 *
 * Data: fetches /api/prayer-times/today?mosque_id=… ; all fields degrade
 * gracefully to placeholders if the API is unavailable.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import MosqueHeroIllustration from '@/components/MosqueHeroIllustration';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PrayerTimes {
  fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string;
  sunrise?: string; sunset?: string;
}
interface HomeData {
  mosqueName: string;
  city: string;
  hijriDate: string;
  weather?: { temp: number; condition: string };
  announcement?: { title: string; body: string; url?: string };
}

const PRAYER_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
const PRAYER_LABELS: Record<string, string> = {
  fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
};
const PRAYER_ICONS: Record<string, string> = {
  fajr: '🌙', dhuhr: '☀️', asr: '⛅', maghrib: '🌅', isha: '🌘',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const am = h < 12;
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
}
function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export default function HomePage() {
  const [times, setTimes] = useState<PrayerTimes | null>(null);
  const [home, setHome]   = useState<HomeData | null>(null);
  const [tick, setTick]   = useState(0);

  // Live countdown tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Load data
  useEffect(() => {
    fetch('/api/home')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setHome(d))
      .catch(() => {});
    fetch('/api/prayer-times/today')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d?.times && setTimes(d.times))
      .catch(() => {});
  }, []);

  // ── Next prayer computation ────────────────────────────────────────────
  const next = useMemo(() => {
    if (!times) return null;
    const now = new Date();
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    for (const p of PRAYER_ORDER) {
      const t = times[p];
      if (!t) continue;
      const [h, m] = t.split(':').map(Number);
      const sec = h * 3600 + m * 60;
      if (sec > nowSec) {
        const prevIdx = PRAYER_ORDER.indexOf(p) - 1;
        const prevT = prevIdx >= 0 ? times[PRAYER_ORDER[prevIdx]] : '00:00';
        const [ph, pm] = prevT.split(':').map(Number);
        const prevSec = ph * 3600 + pm * 60;
        const span = sec - prevSec;
        const elapsed = nowSec - prevSec;
        const pct = Math.min(100, Math.max(0, Math.round((elapsed / span) * 100)));
        const remain = sec - nowSec;
        const hh = Math.floor(remain / 3600);
        const mm = Math.floor((remain % 3600) / 60);
        const ss = remain % 60;
        return {
          name: PRAYER_LABELS[p],
          key: p,
          time: t,
          countdown: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`,
          pct,
        };
      }
    }
    // After Isha → next is Fajr tomorrow
    return {
      name: 'Fajr', key: 'fajr', time: times.fajr,
      countdown: '—', pct: 100,
    };
  }, [times, tick]);

  const gregorian = new Date().toLocaleDateString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  const isFriday = new Date().getDay() === 5;
  const nowMin = nowMinutes();

  // ── Radial ring geometry ────────────────────────────────────────────────
  const R = 52, C = 2 * Math.PI * R;
  const pct = next?.pct ?? 0;

  return (
    <main className="home">

      {/* ── Hero header ──────────────────────────────────────────────── */}
      <header className="hero">
        <div className="hero__img" aria-hidden="true">
          <MosqueHeroIllustration />
        </div>
        <div className="hero__content">
          <div className="hero__topbar">
            <p className="hero__greeting">Assalamu Alaikum 👋</p>
            <div className="hero__actions">
              <Link href="/notifications" className="icon-btn" aria-label="Notifications">
                <BellIcon /><span className="dot" />
              </Link>
              <Link href="/profile" className="icon-btn" aria-label="Profile">
                <UserIcon />
              </Link>
            </div>
          </div>

          <h1 className="hero__mosque">{home?.mosqueName ?? 'Masjid Connect'}</h1>
          <p className="hero__location">
            <PinIcon /> {home?.city ?? 'Canada'}
          </p>

          <div className="hero__chips">
            <div className="chip">
              <span className="chip__icon">📅</span>
              <span>
                <strong>{gregorian}</strong>
                <small>Gregorian</small>
              </span>
            </div>
            <div className="chip">
              <span className="chip__icon">🌙</span>
              <span>
                <strong dir="rtl">{home?.hijriDate ?? '—'}</strong>
                <small>Hijri</small>
              </span>
            </div>
          </div>

          {home?.weather && (
            <div className="weather">
              <span className="weather__icon">⛅</span>
              <span>
                <strong>{home.weather.temp}°C</strong>
                <small>{home.weather.condition}</small>
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Next Prayer card ─────────────────────────────────────────── */}
      <section className="next-card" aria-label="Next prayer">
        <div className="next-card__ring">
          <svg viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="7" />
            <circle
              cx="60" cy="60" r={R} fill="none"
              stroke="url(#ringGrad)" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100}
              transform="rotate(-90 60 60)"
            />
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f4d58d" />
                <stop offset="100%" stopColor="#74c69d" />
              </linearGradient>
            </defs>
          </svg>
          <div className="next-card__ring-center">
            <MosqueIcon />
            <span className="next-card__pct">{pct}%</span>
          </div>
        </div>

        <div className="next-card__info">
          <p className="next-card__label">Next Prayer</p>
          <h2 className="next-card__name">
            {isFriday && next?.key === 'dhuhr' ? "Jumu'ah" : next?.name ?? '—'}
          </h2>
          <p className="next-card__countdown">{next?.countdown ?? '--:--:--'}</p>
          <p className="next-card__time">{next ? `${fmt12(next.time)} (Adhan)` : ''}</p>
        </div>

        <div className="next-card__sun">
          <div className="sun-row">
            <span className="sun-icon">🌅</span>
            <span><small>Sunrise</small><strong>{times?.sunrise ? fmt12(times.sunrise) : '—'}</strong></span>
          </div>
          <div className="sun-row">
            <span className="sun-icon">🌇</span>
            <span><small>Sunset</small><strong>{times?.sunset ? fmt12(times.sunset) : '—'}</strong></span>
          </div>
        </div>
      </section>

      {/* ── Feature cards ────────────────────────────────────────────── */}
      <section className="features" aria-label="Quick actions">
        <FeatureCard href="/prayer"     tint="green"  icon="🕐" title="Prayer Times" sub="View today's prayer schedule" />
        <FeatureCard href="/qibla"      tint="blue"   icon="🧭" title="Qibla Finder" sub="Find direction to the Qibla" />
        <FeatureCard href="/live"       tint="purple" icon="📡" title="Live Stream"  sub="Watch lectures & programs live" />
        <FeatureCard href="/events"     tint="orange" icon="📅" title="Events"       sub="See upcoming events" />
      </section>

      {/* ── Daily Dua ────────────────────────────────────────────────── */}
      <section className="dua-card" aria-label="Daily dua">
        <div className="dua-card__head">
          <h3>Daily Dua</h3>
          <Link href="/duas" className="pill-link">View All</Link>
        </div>
        <blockquote className="dua-card__arabic" dir="rtl" lang="ar">
          اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ
        </blockquote>
        <p className="dua-card__translation">
          O Allah, I ask You for forgiveness and well-being in this world and the Hereafter.
        </p>
        <div className="dua-card__actions">
          <button className="play-btn" aria-label="Play audio"><PlayIcon /></button>
          <button className="save-btn" aria-label="Save dua"><BookmarkIcon /></button>
        </div>
      </section>

      {/* ── Upcoming prayers timeline ────────────────────────────────── */}
      <section className="timeline-card" aria-label="Upcoming prayers">
        <div className="timeline-card__head">
          <h3>Upcoming Prayers</h3>
          <Link href="/prayer" className="pill-link pill-link--plain">View All</Link>
        </div>
        <div className="timeline">
          {PRAYER_ORDER.map((p, i) => {
            const t = times?.[p];
            const passed = t ? toMinutes(t) < nowMin : false;
            const isNext = next?.key === p;
            return (
              <div key={p} className={`timeline__item ${isNext ? 'timeline__item--next' : ''}`}>
                <span className="timeline__icon">{PRAYER_ICONS[p]}</span>
                <span className="timeline__name">
                  {isFriday && p === 'dhuhr' ? "Jumu'ah" : PRAYER_LABELS[p]}
                </span>
                <span className="timeline__time">{t ? fmt12(t) : '—'}</span>
                <span className={`timeline__node ${passed ? 'timeline__node--done' : ''} ${isNext ? 'timeline__node--next' : ''}`} />
                {passed && <span className="timeline__check">✓</span>}
              </div>
            );
          })}
          <div className="timeline__track" aria-hidden="true" />
        </div>
      </section>

      {/* ── Announcement banner ──────────────────────────────────────── */}
      {home?.announcement && (
        <section className="announce" role="note">
          <span className="announce__icon">📢</span>
          <div className="announce__text">
            <strong>{home.announcement.title}</strong>
            <p>{home.announcement.body}</p>
          </div>
          <Link href={home.announcement.url ?? '/announcements'} className="announce__cta">
            View Details ›
          </Link>
        </section>
      )}

      <BottomNav active="home" />

      <style>{styles}</style>
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function FeatureCard({ href, tint, icon, title, sub }: {
  href: string; tint: 'green' | 'blue' | 'purple' | 'orange';
  icon: string; title: string; sub: string;
}) {
  return (
    <Link href={href} className={`feature feature--${tint}`}>
      <span className="feature__icon">{icon}</span>
      <span className="feature__title">{title}</span>
      <span className="feature__sub">{sub}</span>
      <span className="feature__arrow">›</span>
    </Link>
  );
}



// ── Inline icons (stroke style, matching mockup) ─────────────────────────────
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
function BellIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" {...S}><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/></svg>; }
function UserIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" {...S}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function PinIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" {...S}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function PlayIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21"/></svg>; }
function BookmarkIcon(){ return <svg width="18" height="18" viewBox="0 0 24 24" {...S}><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>; }
function MosqueIcon(){ return <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M12 2c0 3-4 4-4 7h8c0-3-4-4-4-7zM4 11h16v3H4zM5 14v7M9 14v7M15 14v7M19 14v7M3 21h18M9 21v-3a3 3 0 016 0v3"/></svg>; }

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = `
:root {
  --mc-emerald: #1b4332;
  --mc-emerald-2: #2d6a4f;
  --mc-cream: #faf7f2;
  --mc-ink: #16211c;
  --mc-muted: #6b7671;
  --mc-gold: #f4d58d;
  --mc-card: #ffffff;
  --mc-radius: 22px;
}

.home {
  background: var(--mc-cream);
  min-height: 100vh;
  padding-bottom: 96px;
  font-family: ui-sans-serif, -apple-system, 'Segoe UI', sans-serif;
  color: var(--mc-ink);
}

/* ── Hero ── */
.hero { position: relative; padding: 1rem 1.25rem 0.5rem; overflow: hidden; }
.hero__img {
  position: absolute; top: 0; right: -8%; width: 78%; height: 340px;
  -webkit-mask-image: linear-gradient(200deg, #000 55%, transparent 96%);
  mask-image: linear-gradient(200deg, #000 55%, transparent 96%);
  z-index: 0;
  pointer-events: none;
}
.hero__img svg { display: block; }
.hero__content { position: relative; z-index: 1; }
.hero__topbar { display: flex; justify-content: space-between; align-items: center; }
.hero__greeting { font-size: 0.9375rem; color: var(--mc-ink); margin: 0.25rem 0 0.35rem; font-weight: 500; }
.hero__actions { display: flex; gap: 0.5rem; }
.icon-btn {
  position: relative; width: 42px; height: 42px; border-radius: 50%;
  background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.07);
  display: flex; align-items: center; justify-content: center;
  color: var(--mc-ink); text-decoration: none;
}
.icon-btn .dot {
  position: absolute; top: 9px; right: 10px; width: 7px; height: 7px;
  background: var(--mc-emerald-2); border-radius: 50%;
}
.hero__mosque {
  font-family: 'Iowan Old Style', 'Palatino', Georgia, serif;
  font-size: clamp(1.9rem, 8vw, 2.5rem);
  line-height: 1.06; letter-spacing: -0.01em;
  color: var(--mc-emerald); margin: 0.25rem 0 0.4rem; max-width: 60%;
  font-weight: 700;
}
.hero__location {
  display: flex; align-items: center; gap: 0.35rem;
  font-size: 0.875rem; color: var(--mc-ink); margin: 0 0 0.9rem;
}
.hero__chips { display: flex; gap: 0.6rem; flex-wrap: wrap; }
.chip {
  display: flex; align-items: center; gap: 0.5rem;
  background: rgba(255,255,255,0.82); backdrop-filter: blur(4px);
  border-radius: 14px; padding: 0.55rem 0.8rem;
  box-shadow: 0 1px 6px rgba(0,0,0,0.05);
}
.chip__icon { font-size: 1.05rem; }
.chip strong { display: block; font-size: 0.8125rem; }
.chip small { color: var(--mc-muted); font-size: 0.6875rem; }
.weather { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem; }
.weather__icon { font-size: 1.4rem; }
.weather strong { display: block; font-size: 1rem; }
.weather small { color: var(--mc-muted); font-size: 0.75rem; }

/* ── Next Prayer card ── */
.next-card {
  margin: 1rem 1.25rem 0;
  background: linear-gradient(135deg, var(--mc-emerald) 0%, var(--mc-emerald-2) 100%);
  border-radius: var(--mc-radius);
  box-shadow: 0 14px 30px rgba(27,67,50,0.35);
  padding: 1.25rem;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 1rem;
  align-items: center;
  color: #fff;
}
.next-card__ring { position: relative; width: 120px; height: 120px; }
.next-card__ring-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
}
.next-card__pct { font-size: 0.8125rem; font-weight: 700; color: var(--mc-gold); }
.next-card__label { font-size: 0.8125rem; opacity: 0.85; margin: 0; }
.next-card__name {
  font-family: 'Iowan Old Style', 'Palatino', Georgia, serif;
  font-size: 1.9rem; margin: 0.1rem 0; font-weight: 700;
}
.next-card__countdown {
  font-size: clamp(1.7rem, 7.5vw, 2.2rem);
  font-weight: 700; letter-spacing: 0.02em; margin: 0;
  font-variant-numeric: tabular-nums;
}
.next-card__time { font-size: 0.8125rem; opacity: 0.85; margin: 0.15rem 0 0; }
.next-card__sun {
  display: flex; flex-direction: column; gap: 0.9rem;
  border-left: 1px solid rgba(255,255,255,0.25); padding-left: 1rem;
}
.sun-row { display: flex; align-items: center; gap: 0.5rem; }
.sun-icon { font-size: 1.2rem; }
.sun-row small { display: block; font-size: 0.6875rem; opacity: 0.8; }
.sun-row strong { font-size: 0.875rem; }

@media (max-width: 400px) {
  .next-card { grid-template-columns: auto 1fr; }
  .next-card__sun {
    grid-column: 1 / -1; flex-direction: row; justify-content: space-around;
    border-left: none; border-top: 1px solid rgba(255,255,255,0.25);
    padding: 0.75rem 0 0; margin-top: 0.25rem;
  }
}

/* ── Feature cards ── */
.features {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem; margin: 1rem 1.25rem 0;
}
@media (min-width: 480px) { .features { grid-template-columns: repeat(4, 1fr); } }
.feature {
  position: relative; border-radius: 18px; padding: 1rem;
  display: flex; flex-direction: column; gap: 0.3rem;
  text-decoration: none; color: var(--mc-ink);
  min-height: 120px;
}
.feature--green  { background: #e6f4ec; }
.feature--blue   { background: #e7f0fb; }
.feature--purple { background: #f1ebfa; }
.feature--orange { background: #fdf1e3; }
.feature__icon {
  width: 44px; height: 44px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.25rem; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.feature__title { font-weight: 700; font-size: 0.9375rem; margin-top: 0.35rem; }
.feature__sub { font-size: 0.75rem; color: var(--mc-muted); line-height: 1.35; }
.feature__arrow {
  position: absolute; bottom: 0.8rem; right: 0.8rem;
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--mc-emerald); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; line-height: 1;
}
.feature--blue .feature__arrow   { background: #3a6ea5; }
.feature--purple .feature__arrow { background: #7a5ba6; }
.feature--orange .feature__arrow { background: #d98e32; }

/* ── Daily Dua ── */
.dua-card {
  margin: 1rem 1.25rem 0; background: var(--mc-card);
  border-radius: var(--mc-radius); padding: 1.25rem;
  box-shadow: 0 4px 18px rgba(0,0,0,0.06);
}
.dua-card__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
.dua-card__head h3 { margin: 0; font-size: 0.9375rem; font-weight: 700; }
.pill-link {
  background: var(--mc-cream); color: var(--mc-emerald);
  font-size: 0.75rem; font-weight: 600; text-decoration: none;
  padding: 0.4rem 0.9rem; border-radius: 999px;
}
.pill-link--plain { background: none; padding: 0; }
.dua-card__arabic {
  font-family: 'Noto Naskh Arabic', 'Geeza Pro', serif;
  font-size: 1.35rem; line-height: 2; color: var(--mc-ink);
  margin: 0 0 0.5rem; quotes: none;
}
.dua-card__translation { font-size: 0.875rem; color: var(--mc-muted); line-height: 1.55; margin: 0 0 1rem; }
.dua-card__actions { display: flex; gap: 0.6rem; }
.play-btn, .save-btn {
  width: 46px; height: 46px; border-radius: 50%; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.play-btn { background: var(--mc-emerald); color: #fff; }
.save-btn { background: #fff; color: var(--mc-ink); border: 1.5px solid rgba(0,0,0,0.12); }

/* ── Upcoming prayers ── */
.timeline-card {
  margin: 1rem 1.25rem 0; background: var(--mc-card);
  border-radius: var(--mc-radius); padding: 1.25rem 1rem;
  box-shadow: 0 4px 18px rgba(0,0,0,0.06);
}
.timeline-card__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 0 0.25rem; }
.timeline-card__head h3 { margin: 0; font-size: 0.9375rem; font-weight: 700; }
.timeline { position: relative; display: flex; justify-content: space-between; }
.timeline__track {
  position: absolute; left: 8%; right: 8%; bottom: 26px; height: 2px;
  background: rgba(0,0,0,0.1); z-index: 0;
}
.timeline__item {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
  padding: 0.5rem 0.4rem 1.6rem; border-radius: 14px; flex: 1;
}
.timeline__item--next { background: #eef7f1; }
.timeline__icon { font-size: 1.15rem; }
.timeline__name { font-size: 0.75rem; font-weight: 600; }
.timeline__time { font-size: 0.6875rem; color: var(--mc-muted); }
.timeline__node {
  position: absolute; bottom: 22px; width: 10px; height: 10px;
  border-radius: 50%; background: #fff; border: 2px solid rgba(0,0,0,0.2);
}
.timeline__node--done { background: var(--mc-emerald-2); border-color: var(--mc-emerald-2); }
.timeline__node--next { background: var(--mc-emerald); border-color: var(--mc-emerald); transform: scale(1.25); }
.timeline__check { position: absolute; bottom: 2px; color: var(--mc-emerald-2); font-size: 0.75rem; font-weight: 700; }

/* ── Announcement ── */
.announce {
  margin: 1rem 1.25rem 0; background: #fdeee3;
  border-radius: 18px; padding: 1rem;
  display: flex; align-items: center; gap: 0.75rem;
}
.announce__icon {
  width: 44px; height: 44px; border-radius: 50%; background: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0;
}
.announce__text { flex: 1; min-width: 0; }
.announce__text strong { font-size: 0.875rem; display: block; margin-bottom: 0.15rem; }
.announce__text p { font-size: 0.78rem; color: var(--mc-muted); margin: 0; line-height: 1.4; }
.announce__cta {
  background: #fff; color: #c46a1f; font-size: 0.78rem; font-weight: 700;
  text-decoration: none; padding: 0.55rem 0.9rem; border-radius: 999px;
  white-space: nowrap; flex-shrink: 0;
}


@media (prefers-reduced-motion: reduce) {
  .home * { transition: none !important; animation: none !important; }
}
`;
