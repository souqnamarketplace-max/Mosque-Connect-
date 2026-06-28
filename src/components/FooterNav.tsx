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
      className="fixed bottom-0 left-0 right-0 z-30 flex justify-center px-4 pb-4"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      {/* Floating glass pill: glassmorphism is a semi-transparent surface +
       * backdrop-blur + soft border/shadow, not a single utility class. */}
      <div
        className="w-full max-w-md grid grid-cols-5 rounded-[28px] shadow-float backdrop-blur-xl border border-white/40 dark:border-white/10"
        style={{ backgroundColor: "color-mix(in srgb, var(--color-card) 72%, transparent)" }}
      >
        {ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center gap-1 py-3"
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <span className="absolute inset-x-2 top-1 bottom-1 rounded-2xl bg-night-teal/10 transition-opacity duration-300" />
              )}
              <Icon
                className={`relative z-10 transition-all duration-300 ${
                  isActive ? "w-6 h-6 scale-110 text-night-teal" : "w-5 h-5 text-ink-secondary"
                }`}
                strokeWidth={isActive ? 2.25 : 1.75}
              />
              <span
                className={`relative z-10 text-[11px] transition-all duration-300 ${
                  isActive ? "text-night-teal font-semibold opacity-100" : "text-ink-secondary font-medium opacity-70"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
