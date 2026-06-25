import Link from "next/link";
import { Compass, CalendarDays, HandCoins, Radio, Megaphone, Building2 } from "lucide-react";

const ACTIONS = [
  { href: "/qibla", icon: Compass, label: "Qibla" },
  { href: "/events", icon: CalendarDays, label: "Events" },
  { href: "/donate", icon: HandCoins, label: "Donate" },
  { href: "/live", icon: Radio, label: "Live Stream" },
  { href: "/announcements", icon: Megaphone, label: "Announcements" },
  { href: "/mosque", icon: Building2, label: "Mosque Profile" },
];

export default function QuickActionsGrid() {
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
