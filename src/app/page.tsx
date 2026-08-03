'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import FooterNav from '@/components/FooterNav';
import MosqueHeroIllustration from '@/components/MosqueHeroIllustration';
import DeviceInitializer from '@/components/DeviceInitializer';
import EmergencyBanner from '@/components/EmergencyBanner';
import { useI18n } from '@/lib/i18n/I18nProvider';

interface PrayerTimes {
  fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string;
  sunrise?: string; sunset?: string;
}
interface HomeData {
  mosqueId: string | null; mosqueName: string | null; city: string | null; hijriDate: string;
  weather?: { temp: number; condition: string };
  announcement?: { title: string; body: string; url?: string };
}
interface FeaturedDua {
  text: string;
}
interface JumuahSlot { start: string; end: string | null; }
interface JumuahInfo { first: JumuahSlot | null; second: JumuahSlot | null; }

const ORDER = ['fajr','dhuhr','asr','maghrib','isha'] as const;

function fmt12(t?: string) {
  if (!t) return '—';
  const [h,m] = t.split(':').map(Number);
  return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;
}

export default function HomePage() {
  const { dict, language } = useI18n();
  const [times, setTimes] = useState<PrayerTimes|null>(null);
  const [jumuah, setJumuah] = useState<JumuahInfo|null>(null);
  const [home,  setHome]  = useState<HomeData|null>(null);
  const [dua,   setDua]   = useState<FeaturedDua|null>(null);
  const [tick,  setTick]  = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t+1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch('/api/home').then(r=>r.ok?r.json():null).then(d=>d&&setHome(d)).catch(()=>{});
  }, []);

  // Iqama times take priority per prayer (what congregants actually go by);
  // any prayer without a set iqama for the day falls back to its Adhan time.
  useEffect(() => {
    if (!home?.mosqueId) return;
    fetch(`/api/prayer-times/today?mosque_id=${home.mosqueId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.adhan) return;
        const iqama = d.iqama ?? {};
        setTimes({
          fajr: iqama.fajr ?? d.adhan.fajr,
          dhuhr: iqama.dhuhr ?? d.adhan.dhuhr,
          asr: iqama.asr ?? d.adhan.asr,
          maghrib: iqama.maghrib ?? d.adhan.maghrib,
          isha: iqama.isha ?? d.adhan.isha,
          sunrise: d.adhan.sunrise,
          sunset: d.adhan.maghrib,
        });
        setJumuah(d.isJumuah ? d.jumuah ?? null : null);
      })
      .catch(() => {});
  }, [home?.mosqueId]);

  useEffect(() => {
    fetch(`/api/dua-content/featured?lang=${language}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.text && setDua(d))
      .catch(() => {});
  }, [language]);

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
        return { name:dict.prayers[p], key:p, time:t, pct,
          countdown:`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}` };
      }
    }
    return { name:dict.prayers.fajr, key:'fajr' as const, time:times.fajr, pct:100, countdown:'—' };
  }, [times, tick, dict]);

  const isFriday = new Date().getDay()===5;
  const locale = language === 'ar' ? 'ar' : language === 'ur' ? 'ur' : 'en-CA';
  const dateStr = new Date().toLocaleDateString(locale,{weekday:'short',month:'short',day:'numeric'});
  const R=52, C=2*Math.PI*R;

  return (
    <main className="home">
      <DeviceInitializer />

      {home?.mosqueId && (
        <div className="mx-4 mt-3">
          <EmergencyBanner mosqueId={home.mosqueId} />
        </div>
      )}

      {/* ── Hero ── */}
      <header className="hero">
        <div className="hero__bg"><MosqueHeroIllustration /></div>
        <div className="hero__overlay" />
        <div className="hero__top">
          <div>
            <p className="hero__greeting">{dict.home.greeting} 👋</p>
            <h1 className="hero__name">{home?.mosqueName ?? 'Masjid Connect'}</h1>
            <p className="hero__meta">
              <span>📅 {dateStr}</span>
              {home?.hijriDate && <span>· 🌙 {home.hijriDate}</span>}
              {home?.weather && <span>· {home.weather.temp}°C {home.weather.condition}</span>}
            </p>
          </div>
          <div className="hero__btns">
            <Link href="/notification-settings" className="icon-btn" aria-label={dict.common.notifications}><BellIcon /></Link>
            <Link href="/profile" className="icon-btn" aria-label={dict.home.footerNav.profile}><UserIcon /></Link>
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
                <stop offset="0%" stopColor="var(--color-gold)"/>
                <stop offset="100%" stopColor="var(--color-night-teal-light)"/>
              </linearGradient>
            </defs>
          </svg>
          <div className="prayer-card__ring-inner">
            <MosqueIconSm />
            <span className="prayer-card__pct">{next?.pct??0}%</span>
          </div>
        </div>
        <div className="prayer-card__info">
          <p className="prayer-card__label">{dict.home.nextPrayer}</p>
          <h2 className="prayer-card__name">
            {isFriday&&next?.key==='dhuhr' ? dict.home.jumuah : next?.name ?? '—'}
          </h2>
          <p className="prayer-card__countdown">{next?.countdown ?? '--:--:--'}</p>
          <p className="prayer-card__time">{next ? `${fmt12(next.time)} (${dict.prayerPage.adhan})` : ''}</p>
          {isFriday && next?.key==='dhuhr' && (jumuah?.first || jumuah?.second) && (
            <p className="prayer-card__jumuah">
              {jumuah.first && `1: ${fmt12(jumuah.first.start)}`}
              {jumuah.second && ` · 2: ${fmt12(jumuah.second.start)}`}
            </p>
          )}
        </div>
        <div className="prayer-card__sun">
          <div className="sun-row"><span>🌅</span><div><small>{dict.prayerPage.sunrise}</small><strong>{fmt12(times?.sunrise)}</strong></div></div>
          <div className="sun-row"><span>🌇</span><div><small>{dict.prayerPage.sunset}</small><strong>{fmt12(times?.sunset)}</strong></div></div>
        </div>
      </section>

      {/* ── Quick actions 2×2 ── */}
      <section className="grid4">
        <QCard href="/prayer" tint="tint-a" icon="🕐" label={dict.home.quickActions.prayerTimes} />
        <QCard href="/qibla"  tint="tint-b" icon="🧭" label={dict.home.quickActions.qibla} />
        <QCard href="/events" tint="tint-c" icon="📅" label={dict.home.quickActions.events} />
        <QCard href="/donate" tint="tint-d" icon="💚" label={dict.home.quickActions.donate} />
      </section>

      {/* ── Announcement ── */}
      {home?.announcement && (
        <section className="announce">
          <span className="announce__icon">📢</span>
          <div className="announce__body">
            <strong>{home.announcement.title}</strong>
            <p>{home.announcement.body}</p>
          </div>
          <Link href={home.announcement.url??'/announcements'} className="announce__cta">
            {dict.home.viewAll} <ChevronRight className="inline w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </section>
      )}

      {/* ── Daily dua teaser ── */}
      <Link href="/duas" className="dua-teaser">
        <span className="dua-teaser__label">{dict.duas.title}</span>
        <p className="dua-teaser__arabic" dir="rtl" lang="ar">
          {dua?.text ?? 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ'}
        </p>
        <span className="dua-teaser__arrow">
          {dict.home.viewAll} <ChevronRight className="inline w-3.5 h-3.5 rtl:rotate-180" />
        </span>
      </Link>

      <FooterNav />
      <style>{css}</style>
    </main>
  );
}

function QCard({ href, tint, icon, label }: { href:string; tint:string; icon:string; label:string }) {
  return (
    <Link href={href} className={`qcard ${tint}`}>
      <span className="qcard__icon">{icon}</span>
      <span className="qcard__label">{label}</span>
    </Link>
  );
}

const S = { fill:'none', stroke:'currentColor', strokeWidth:1.8, strokeLinecap:'round' as const, strokeLinejoin:'round' as const };
function BellIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" {...S}><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/></svg>; }
function UserIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" {...S}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function MosqueIconSm(){ return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M12 2c0 3-4 4-4 7h8c0-3-4-4-4-7zM4 11h16v3H4zM5 14v7M19 14v7M3 21h18M9 21v-3a3 3 0 016 0v3"/></svg>; }

// Colors below reference the app's shared theme tokens (--color-* from
// globals.css) instead of hardcoded hex, so this page follows the same
// light/dark theme (.dark class on <html>, toggled from Settings) as
// every other screen instead of always rendering a fixed light palette.
const css = `
*{box-sizing:border-box;}
.home{background:var(--color-sand);min-height:100vh;padding-bottom:80px;color:var(--color-ink);}

/* Hero */
.hero{position:relative;height:200px;overflow:hidden;border-radius:0 0 28px 28px;}
.hero__bg{position:absolute;inset:0;z-index:0;}
.hero__overlay{position:absolute;inset:0;background:linear-gradient(170deg,rgba(17,77,68,0.82) 0%,rgba(17,77,68,0.55) 60%,rgba(17,77,68,0.2) 100%);z-index:1;}
.hero__top{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-start;padding:1rem 1.1rem 0;}
.hero__greeting{font-size:0.875rem;color:rgba(255,255,255,0.85);margin:0 0 0.2rem;}
.hero__name{font-family:var(--font-display);font-size:clamp(1.4rem,6vw,1.9rem);color:#fff;font-weight:700;margin:0 0 0.4rem;line-height:1.1;max-width:220px;}
.hero__meta{display:flex;flex-wrap:wrap;gap:0.4rem;font-size:0.75rem;color:rgba(255,255,255,0.8);margin:0;}
.hero__btns{display:flex;gap:0.5rem;flex-shrink:0;}
.icon-btn{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.18);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;color:#fff;text-decoration:none;}

/* Prayer card */
.prayer-card{margin:1rem 1rem 0;background:linear-gradient(135deg,var(--color-night-teal) 0%,var(--color-night-teal-light) 100%);border-radius:22px;padding:1rem 1rem;display:grid;grid-template-columns:auto 1fr auto;gap:0.75rem;align-items:center;color:#fff;box-shadow:var(--shadow-float);}
.prayer-card__ring{position:relative;width:110px;height:110px;flex-shrink:0;}
.prayer-card__ring-inner{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;}
.prayer-card__pct{font-size:0.75rem;font-weight:700;color:var(--color-gold);}
.prayer-card__label{font-size:0.75rem;opacity:0.85;margin:0;}
.prayer-card__name{font-family:var(--font-display);font-size:1.6rem;font-weight:700;margin:0.1rem 0;}
.prayer-card__countdown{font-size:1.6rem;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:0.02em;margin:0;}
.prayer-card__time{font-size:0.75rem;opacity:0.85;margin:0.1rem 0 0;}
.prayer-card__jumuah{font-size:0.72rem;opacity:0.85;margin:0.2rem 0 0;color:var(--color-gold);}
.prayer-card__sun{display:flex;flex-direction:column;gap:0.6rem;border-left:1px solid rgba(255,255,255,0.2);padding-left:0.75rem;}
[dir="rtl"] .prayer-card__sun{border-left:none;border-right:1px solid rgba(255,255,255,0.2);padding-left:0;padding-right:0.75rem;}
.sun-row{display:flex;align-items:center;gap:0.4rem;font-size:0.8rem;}
.sun-row small{display:block;font-size:0.65rem;opacity:0.8;}
.sun-row strong{font-size:0.8rem;}

/* Quick actions */
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:0.6rem;margin:0.9rem 1rem 0;}
.qcard{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.35rem;border-radius:18px;padding:0.9rem 0.4rem;text-decoration:none;color:var(--color-ink);min-height:80px;}
.qcard.tint-a{background:color-mix(in srgb, var(--color-night-teal) 12%, var(--color-card));}
.qcard.tint-b{background:color-mix(in srgb, #3b82f6 14%, var(--color-card));}
.qcard.tint-c{background:color-mix(in srgb, var(--color-gold) 18%, var(--color-card));}
.qcard.tint-d{background:color-mix(in srgb, #a855f7 14%, var(--color-card));}
.qcard__icon{font-size:1.4rem;}
.qcard__label{font-size:0.72rem;font-weight:600;text-align:center;line-height:1.2;}

/* Announcement */
.announce{margin:0.9rem 1rem 0;background:color-mix(in srgb, var(--color-gold) 12%, var(--color-card));border-radius:16px;padding:0.85rem;display:flex;align-items:center;gap:0.65rem;border-left:3px solid var(--color-gold);}
[dir="rtl"] .announce{border-left:none;border-right:3px solid var(--color-gold);}
.announce__icon{font-size:1.2rem;flex-shrink:0;}
.announce__body{flex:1;min-width:0;}
.announce__body strong{font-size:0.8125rem;display:block;}
.announce__body p{font-size:0.75rem;color:var(--color-ink-secondary);margin:0.1rem 0 0;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.announce__cta{color:var(--color-gold);font-size:0.75rem;font-weight:700;text-decoration:none;white-space:nowrap;flex-shrink:0;display:inline-flex;align-items:center;gap:0.15rem;}

/* Daily dua teaser */
.dua-teaser{display:block;margin:0.9rem 1rem 0;background:var(--color-card);border-radius:18px;padding:1rem;text-decoration:none;color:var(--color-ink);box-shadow:var(--shadow-card);}
.dua-teaser__label{font-size:0.75rem;font-weight:700;color:var(--color-night-teal);display:block;margin-bottom:0.4rem;}
.dua-teaser__arabic{font-family:var(--font-arabic);font-size:1.1rem;line-height:1.9;margin:0 0 0.5rem;text-align:right;}
.dua-teaser__arrow{font-size:0.75rem;font-weight:600;color:var(--color-night-teal);display:inline-flex;align-items:center;gap:0.15rem;}
`;
