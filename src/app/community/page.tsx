"use client";

import Link from "next/link";
import { Moon, GraduationCap, HandHeart, Search, Store, Heart } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import FooterNav from "@/components/FooterNav";

interface CommunityItem {
  href: string;
  icon: typeof Moon;
  label: string;
  available: boolean;
}

export default function CommunityPage() {
  const { dict } = useI18n();

  const ITEMS: CommunityItem[] = [
    { href: "/community/ramadan", icon: Moon, label: dict.community.ramadan, available: true },
    { href: "/community/classes", icon: GraduationCap, label: dict.community.classes, available: true },
    { href: "/community/volunteer", icon: HandHeart, label: dict.community.volunteer, available: true },
    { href: "/community/lost-found", icon: Search, label: dict.community.lostFound, available: true },
    { href: "/community/directory", icon: Store, label: dict.community.directory, available: true },
    { href: "/announcements", icon: Heart, label: dict.community.funeralNikah, available: true },
  ];

  return (
    <div className="min-h-screen bg-sand pb-24">
      <header className="px-5 pt-6 pb-2 text-center">
        <h1 className="font-display text-2xl">{dict.community.title}</h1>
      </header>

      <main className="max-w-md mx-auto px-5 py-4 space-y-2">
        {ITEMS.map(({ href, icon: Icon, label, available }) =>
          available ? (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 bg-white rounded-xl p-4 hover:bg-sand-dark/20 transition-colors"
            >
              <Icon className="w-5 h-5 text-night-teal flex-shrink-0" />
              <span className="flex-1 font-medium">{label}</span>
            </Link>
          ) : (
            <div
              key={href}
              className="flex items-center gap-3 bg-white/60 rounded-xl p-4 opacity-60"
              aria-disabled="true"
            >
              <Icon className="w-5 h-5 text-ink/60 flex-shrink-0" />
              <span className="flex-1 text-ink/60">{label}</span>
              <span className="text-xs text-ink/60 bg-sand-dark px-2 py-1 rounded-full">Coming soon</span>
            </div>
          )
        )}
      </main>
      <FooterNav />
    </div>
  );
}
