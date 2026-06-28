"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Announcement {
  id: string;
  category: string;
  title: string;
  body: string | null;
}

export default function LatestAnnouncementCard() {
  const { dict } = useI18n();
  const [item, setItem] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/announcements?limit=1")
      .then((res) => res.json())
      .then((data) => setItem(data[0] ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-20 rounded-2xl bg-card/60 animate-pulse" />;
  if (!item) return null;

  return (
    <Link href="/announcements" className="flex items-center gap-3 bg-card rounded-2xl p-4 border border-sand-dark">
      <div className="w-9 h-9 rounded-full bg-night-teal/10 flex items-center justify-center flex-shrink-0">
        <Megaphone className="w-4 h-4 text-night-teal" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-sage uppercase tracking-wide">{dict.home.latestAnnouncement}</p>
        <p className="font-medium truncate">{item.title}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-ink/60 rtl:rotate-180 flex-shrink-0" />
    </Link>
  );
}
