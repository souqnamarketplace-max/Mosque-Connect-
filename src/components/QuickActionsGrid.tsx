"use client";

import Link from "next/link";
import { Compass, CalendarDays, HandCoins, Radio, Megaphone, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

const COLOR_VARIANTS = [
  { bg: "bg-night-teal/10", fg: "text-night-teal" },
  { bg: "bg-sage/15", fg: "text-sage" },
  { bg: "bg-urgent/10", fg: "text-urgent" },
  { bg: "bg-gold/15", fg: "text-gold" },
  { bg: "bg-night-teal-light/10", fg: "text-night-teal-light" },
  { bg: "bg-success/10", fg: "text-success" },
];

export default function QuickActionsGrid() {
  const { dict } = useI18n();

  const ACTIONS = [
    { href: "/prayer", icon: Clock, label: dict.home.quickActions.prayerTimes, desc: dict.home.quickActions.prayerTimesDesc },
    { href: "/qibla", icon: Compass, label: dict.home.quickActions.qibla, desc: dict.home.quickActions.qiblaDesc },
    { href: "/live", icon: Radio, label: dict.home.quickActions.liveStream, desc: dict.home.quickActions.liveStreamDesc },
    { href: "/events", icon: CalendarDays, label: dict.home.quickActions.events, desc: dict.home.quickActions.eventsDesc },
    { href: "/announcements", icon: Megaphone, label: dict.home.quickActions.announcements, desc: dict.home.quickActions.announcementsDesc },
    { href: "/donate", icon: HandCoins, label: dict.home.quickActions.donate, desc: dict.home.quickActions.donateDesc },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {ACTIONS.map(({ href, icon: Icon, label, desc }, i) => {
        const variant = COLOR_VARIANTS[i % COLOR_VARIANTS.length];
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-start gap-2 p-3 rounded-2xl bg-card shadow-card hover:shadow-card-hover transition-shadow"
          >
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${variant.bg}`}>
              <Icon className={`w-4.5 h-4.5 ${variant.fg}`} strokeWidth={1.9} />
            </span>
            <span className="block">
              <span className="block font-semibold text-[13px] leading-tight">{label}</span>
              <span className="block text-[11px] text-ink-secondary leading-tight mt-0.5">{desc}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
