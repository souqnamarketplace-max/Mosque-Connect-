'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import MosqueHeroIllustration from '@/components/MosqueHeroIllustration';

interface PrayerTimes {
  fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string;
  sunrise?: string; sunset?: string;
}
interface HomeData {
  mosqueName: string; city: string; hijriDate: string;
  weather?: { temp: number; condition: string };
  announcement?: { title: string; body: string; url?: string };
}

const ORDER = ['fajr','dhuhr','asr','maghrib','isha'] as const;
const LABELS: Record<string,string> = { fajr:'Fajr', dhuhr:'Dhuhr', asr:'Asr', maghrib:'Maghrib', isha:'Isha' };

function fmt12(t?: string) {
  if (!t) return '—';
  const [h,m] = t.split(':').map(Number);
  return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;
}

export default function HomePage() {
  const [times, setTimes] = useState<PrayerTimes|null>(null);
  const [home,  setHome]  = useState<HomeData|null>(null);
  const [tick,  setTick]  = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t+1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch('/api/home').then(r=>r.ok?r.json():null).then(d=>d&&setHome(d)).catch(()=>{});
    fetch('/api/prayer-times/today').then(r=>r.ok?r.json():null).then(d=>d?.times&&setTimes(d.times)).catch(()=>{});
  }, []);

  const next = useMemo(() => {
    if (!times) return null;
    const now = new Date();
    const nowSec = now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds();
    for (const p of ORDER) {
      const t = times[p]; if (!t) continue;
      const [h,m] = t.split(':').map(Number);
      const sec = h*3600 + m*60;
      if (sec > nowSec) {
        const pi = ORDER.indexOf(p)-1;
        const pt = pi>=0 ? times[ORDER[pi]] : '00:00';
        const [ph,pm] = pt.split(':').map(Number);
        const ps = ph*3600+pm*60;
        const pct = Math.round(Math.min(100,Math.max(0,((nowSec-ps)/(sec-ps))*100)));
        const rem = sec-nowSec;
        const hh=Math.floor(rem/3600), mm=Math.floor((rem%3600)/60), ss=rem%60;
        return { name:LABELS[p], key:p, time:t, pct,
          countdown:`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}` };
      }
    }
    return { name:'Fajr', key:'fajr', time:times.fajr, pct:100, countdown:'—' };
  }, [times, tick]);

  const isFriday = new Date().getDay()===5;
  const dateStr = new Date().toLocaleDateString('en-CA',{weekday:'short',month:'short',day:'numeric'});
  const R=52, C=2*Math.PI*R;

  return (
    <main className="home">

      {/* ── Hero ── */}
      <header className="hero">
        <div className="hero__bg"><MosqueHeroIllustration /></div>
        <div className="hero__overlay" />
        <div className="hero__top">
          <div>
            <p className="hero__greeting">Assalamu Alaikum 👋</p>
            <h1 className="hero__name">{home?.mosqueName ?? 'Masjid Connect'}</h1>
            <p className="hero__meta">
              <span>📅 {dateStr}</span>
              {home?.hijriDate && <span>· 🌙 {home.hijriDate}</span>}
              {home?.weather && <span>· {home.weather.temp}°C {home.weather.condition}</span>}
            </p>
          </div>
          <div className="hero__btns">
            <Link href="/notifications" className="icon-btn" aria-label="Notifications"><BellIcon /></Link>
            <Link href="/profile"       className="icon-btn" aria-label="Profile"><UserIcon /></Link>
          </div>
        </div>
      </header>

      {/* ── Next Prayer card ── */}
      <section className="prayer-card">
        <div className="prayer-card__ring">
          <svg viewBox="0 0 120 120" width="110" height="110">
            <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7"/>
            <circle cx="60" cy="60" r={R} fill="none" stroke="url(#rg)" strokeWidth="7"
              strokeLinecap="round" strokeDasharray={C}
              strokeDashoffset={C-(C*(next?.pct??0))/100}
              transform="rotate(-90 60 60)"/>
            <defs>
              <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f4d58d"/>
                <stop offset="100%" stopColor="#74c69d"/>
              </linearGradient>
            </defs>
          </svg>
          <div className="prayer-card__ring-inner">
            <MosqueIconSm />
            <span className="prayer-card__pct">{next?.pct??0}%</span>
          </div>
        </div>
        <div className="prayer-card__info">
          <p className="prayer-card__label">Next Prayer</p>
          <h2 className="prayer-card__name">
            {isFriday&&next?.key==='dhuhr' ? "Jumu'ah" : next?.name ?? '—'}
          </h2>
          <p className="prayer-card__countdown">{next?.countdown ?? '--:--:--'}</p>
          <p className="prayer-card__time">{next ? fmt12(next.time)+' (Adhan)' : ''}</p>
        </div>
        <div className="prayer-card__sun">
          <div className="sun-row"><span>🌅</span><div><small>Sunrise</small><strong>{fmt12(times?.sunrise)}</strong></div></div>
          <div className="sun-row"><span>🌇</span><div><small>Sunset</small><strong>{fmt12(times?.sunset)}</strong></div></div>
        </div>
      </section>

      {/* ── Quick actions 2×2 ── */}
      <section className="grid4">
        <QCard href="/prayer"   color="#e6f4ec" icon="🕐" label="Prayer Times" />
        <QCard href="/qibla"    color="#e7f0fb" icon="🧭" label="Qibla" />
        <QCard href="/events"   color="#fdf1e3" icon="📅" label="Events" />
        <QCard href="/donate"   color="#f1ebfa" icon="💚" label="Donate" />
      </section>

      {/* ── Announcement ── */}
      {home?.announcement && (
        <section className="announce">
          <span className="announce__icon">📢</span>
          <div className="announce__body">
            <strong>{home.announcement.title}</strong>
            <p>{home.announcement.body}</p>
          </div>
          <Link href={home.announcement.url??'/announcements'} className="announce__cta">View ›</Link>
        </section>
      )}

      {/* ── Daily dua teaser ── */}
      <Link href="/duas" className="dua-teaser">
        <span className="dua-teaser__label">Daily Dua</span>
        <p className="dua-teaser__arabic" dir="rtl" lang="ar">
          اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ
        </p>
        <span className="dua-teaser__arrow">View All ›</span>
      </Link>

      <BottomNav active="home" />
      <style>{css}</style>
    </main>
  );
}

function QCard({ href, color, icon, label }: { href:string; color:string; icon:string; label:string }) {
  return (
    <Link href={href} className="qcard" style={{ background: color }}>
      <span className="qcard__icon">{icon}</span>
      <span className="qcard__label">{label}</span>
    </Link>
  );
}

const S = { fill:'none', stroke:'currentColor', strokeWidth:1.8, strokeLinecap:'round' as const, strokeLinejoin:'round' as const };
function BellIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" {...S}><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/></svg>; }
function UserIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" {...S}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function MosqueIconSm(){ return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M12 2c0 3-4 4-4 7h8c0-3-4-4-4-7zM4 11h16v3H4zM5 14v7M19 14v7M3 21h18M9 21v-3a3 3 0 016 0v3"/></svg>; }

const css = `
:root{--em:#1b4332;--em2:#2d6a4f;--cream:#faf7f2;--gold:#f4d58d;--ink:#16211c;--muted:#6b7671;}
*{box-sizing:border-box;}
.home{background:var(--cream);min-height:100vh;padding-bottom:80px;font-family:ui-sans-serif,-apple-system,'Segoe UI',sans-serif;color:var(--ink);}

/* Hero */
.hero{position:relative;height:200px;overflow:hidden;border-radius:0 0 28px 28px;}
.hero__bg{position:absolute;inset:0;z-index:0;}
.hero__overlay{position:absolute;inset:0;background:linear-gradient(170deg,rgba(27,67,50,0.82) 0%,rgba(27,67,50,0.55) 60%,rgba(27,67,50,0.2) 100%);z-index:1;}
.hero__top{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-start;padding:1rem 1.1rem 0;}
.hero__greeting{font-size:0.875rem;color:rgba(255,255,255,0.85);margin:0 0 0.2rem;}
.hero__name{font-family:'Iowan Old Style','Palatino',Georgia,serif;font-size:clamp(1.4rem,6vw,1.9rem);color:#fff;font-weight:700;margin:0 0 0.4rem;line-height:1.1;max-width:220px;}
.hero__meta{display:flex;flex-wrap:wrap;gap:0.4rem;font-size:0.75rem;color:rgba(255,255,255,0.8);margin:0;}
.hero__btns{display:flex;gap:0.5rem;flex-shrink:0;}
.icon-btn{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.18);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;color:#fff;text-decoration:none;}

/* Prayer card */
.prayer-card{margin:1rem 1rem 0;background:linear-gradient(135deg,var(--em) 0%,var(--em2) 100%);border-radius:22px;padding:1rem 1rem;display:grid;grid-template-columns:auto 1fr auto;gap:0.75rem;align-items:center;color:#fff;box-shadow:0 10px 28px rgba(27,67,50,0.3);}
.prayer-card__ring{position:relative;width:110px;height:110px;flex-shrink:0;}
.prayer-card__ring-inner{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;}
.prayer-card__pct{font-size:0.75rem;font-weight:700;color:var(--gold);}
.prayer-card__label{font-size:0.75rem;opacity:0.85;margin:0;}
.prayer-card__name{font-family:'Iowan Old Style','Palatino',Georgia,serif;font-size:1.6rem;font-weight:700;margin:0.1rem 0;}
.prayer-card__countdown{font-size:1.6rem;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:0.02em;margin:0;}
.prayer-card__time{font-size:0.75rem;opacity:0.85;margin:0.1rem 0 0;}
.prayer-card__sun{display:flex;flex-direction:column;gap:0.6rem;border-left:1px solid rgba(255,255,255,0.2);padding-left:0.75rem;}
.sun-row{display:flex;align-items:center;gap:0.4rem;font-size:0.8rem;}
.sun-row small{display:block;font-size:0.65rem;opacity:0.8;}
.sun-row strong{font-size:0.8rem;}

/* Quick actions */
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:0.6rem;margin:0.9rem 1rem 0;}
.qcard{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.35rem;border-radius:18px;padding:0.9rem 0.4rem;text-decoration:none;color:var(--ink);min-height:80px;}
.qcard__icon{font-size:1.4rem;}
.qcard__label{font-size:0.72rem;font-weight:600;text-align:center;line-height:1.2;}

/* Announcement */
.announce{margin:0.9rem 1rem 0;background:#fff8f0;border-radius:16px;padding:0.85rem;display:flex;align-items:center;gap:0.65rem;border-left:3px solid #e07b39;}
.announce__icon{font-size:1.2rem;flex-shrink:0;}
.announce__body{flex:1;min-width:0;}
.announce__body strong{font-size:0.8125rem;display:block;}
.announce__body p{font-size:0.75rem;color:var(--muted);margin:0.1rem 0 0;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.announce__cta{color:#c46a1f;font-size:0.75rem;font-weight:700;text-decoration:none;white-space:nowrap;flex-shrink:0;}

/* Daily dua teaser */
.dua-teaser{display:block;margin:0.9rem 1rem 0;background:#fff;border-radius:18px;padding:1rem;text-decoration:none;color:var(--ink);box-shadow:0 2px 12px rgba(0,0,0,0.05);}
.dua-teaser__label{font-size:0.75rem;font-weight:700;color:var(--em);display:block;margin-bottom:0.4rem;}
.dua-teaser__arabic{font-family:'Noto Naskh Arabic','Geeza Pro',serif;font-size:1.1rem;line-height:1.9;margin:0 0 0.5rem;text-align:right;}
.dua-teaser__arrow{font-size:0.75rem;font-weight:600;color:var(--em);}
`;
