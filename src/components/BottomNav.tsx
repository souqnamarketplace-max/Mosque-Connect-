'use client';

import Link from 'next/link';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
function HomeIcon()  { return <svg width="22" height="22" viewBox="0 0 24 24" {...S}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function PeopleIcon(){ return <svg width="22" height="22" viewBox="0 0 24 24" {...S}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>; }
function QuranIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" {...S}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>; }
function CalIcon()   { return <svg width="22" height="22" viewBox="0 0 24 24" {...S}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function GridIcon()  { return <svg width="22" height="22" viewBox="0 0 24 24" {...S}><circle cx="6" cy="6" r="1.5"/><circle cx="18" cy="6" r="1.5"/><circle cx="6" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/></svg>; }

export default function BottomNav({ active }: { active: string }) {
  const items = [
    { key: 'home',      href: '/',          label: 'Home',      icon: <HomeIcon /> },
    { key: 'community', href: '/community', label: 'Community', icon: <PeopleIcon /> },
    { key: 'quran',     href: '/quran',     label: 'Quran',     icon: <QuranIcon />, fab: true },
    { key: 'calendar',  href: '/calendar',  label: 'Calendar',  icon: <CalIcon /> },
    { key: 'more',      href: '/more',      label: 'More',      icon: <GridIcon /> },
  ];
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map(it => (
        <Link
          key={it.key}
          href={it.href}
          className={`bottom-nav__item ${it.fab ? 'bottom-nav__fab' : ''} ${active === it.key ? 'bottom-nav__item--active' : ''}`}
          aria-current={active === it.key ? 'page' : undefined}
        >
          {it.icon}
          <span>{it.label}</span>
        </Link>
      ))}
      <style>{navStyles}</style>
    </nav>
  );
}

const navStyles = `
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: rgba(255,255,255,0.94); backdrop-filter: blur(10px);
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -6px 24px rgba(0,0,0,0.08);
  display: flex; justify-content: space-around; align-items: flex-end;
  padding: 0.5rem 0.5rem calc(0.6rem + env(safe-area-inset-bottom));
  z-index: 100;
}
.bottom-nav__item {
  display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
  color: #6b7671; text-decoration: none; font-size: 0.6875rem;
  padding: 0.35rem 0.6rem; min-width: 56px;
}
.bottom-nav__item--active { color: #1b4332; font-weight: 600; }
.bottom-nav__fab {
  background: #1b4332; color: #fff !important;
  border-radius: 50%; width: 58px; height: 58px;
  justify-content: center; margin-top: -26px;
  box-shadow: 0 8px 20px rgba(27,67,50,0.4);
}
.bottom-nav__fab span { font-size: 0.625rem; }
`;
