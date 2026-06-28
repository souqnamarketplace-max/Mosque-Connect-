"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface EventRow {
  id: string;
  title: string;
  event_date: string;
}

export default function UpcomingEventCard() {
  const { dict, language } = useI18n();
  const [item, setItem] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events?upcoming=true&limit=1")
      .then((res) => res.json())
      .then((data) => setItem(data[0] ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-20 rounded-2xl bg-card/60 animate-pulse" />;
  if (!item) return null;

  const locale = language === "ar" ? "ar" : language === "ur" ? "ur" : "en-US";
  const dateLabel = new Date(item.event_date + "T12:00:00Z").toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });

  return (
    <Link href="/events" className="flex items-center gap-3 bg-card rounded-2xl p-4 border border-sand-dark">
      <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
        <CalendarDays className="w-4 h-4 text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-sage uppercase tracking-wide">{dict.home.upcomingEvent}</p>
        <p className="font-medium truncate">
          {item.title} <span className="text-ink/60 font-normal">· {dateLabel}</span>
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-ink/60 rtl:rotate-180 flex-shrink-0" />
    </Link>
  );
}
