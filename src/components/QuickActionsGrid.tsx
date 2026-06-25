"use client";

import Link from "next/link";
import { Compass, CalendarDays, HandCoins, Radio, Megaphone, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function QuickActionsGrid() {
  const { dict } = useI18n();

  const ACTIONS = [
    { href: "/qibla", icon: Compass, label: dict.home.quickActions.qibla },
    { href: "/events", icon: CalendarDays, label: dict.home.quickActions.events },
    { href: "/donate", icon: HandCoins, label: dict.home.quickActions.donate },
    { href: "/live", icon: Radio, label: dict.home.quickActions.liveStream },
    { href: "/announcements", icon: Megaphone, label: dict.home.quickActions.announcements },
    { href: "/mosque", icon: Building2, label: dict.home.quickActions.mosqueProfile },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {ACTIONS.map(({ href, icon: Icon, label }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white/60 hover:bg-white transition-colors border border-sand-dark"
        >
          <Icon className="w-6 h-6 text-night-teal" strokeWidth={1.75} />
          <span className="text-xs text-ink/80 text-center leading-tight">{label}</span>
        </Link>
      ))}
    </div>
  );
}
