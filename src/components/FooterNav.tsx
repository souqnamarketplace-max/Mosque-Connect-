"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, CalendarDays, Users, User } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function FooterNav() {
  const pathname = usePathname();
  const { dict } = useI18n();

  const ITEMS = [
    { href: "/", icon: Home, label: dict.home.footerNav.home },
    { href: "/prayer", icon: Clock, label: dict.home.footerNav.prayer },
    { href: "/events", icon: CalendarDays, label: dict.home.footerNav.events },
    { href: "/community", icon: Users, label: dict.home.footerNav.community },
    { href: "/profile", icon: User, label: dict.home.footerNav.profile },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-sand-dark z-30"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-md mx-auto grid grid-cols-5">
        {ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 py-2.5"
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={`w-6 h-6 ${isActive ? "text-night-teal" : "text-ink/40"}`}
                strokeWidth={isActive ? 2.25 : 1.75}
              />
              <span className={`text-xs ${isActive ? "text-night-teal font-medium" : "text-ink/50"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
