"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, CalendarDays, Clock, MapPin, User } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import FooterNav from "@/components/FooterNav";

interface Event {
  id: string;
  title: string;
  description: string | null;
  category: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  speaker: string | null;
  registration_url: string | null;
  image_url: string | null;
}

export default function EventsPage() {
  const router = useRouter();
  const { dict, language } = useI18n();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/events?upcoming=${tab === "upcoming"}`)
      .then((res) => res.json())
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [tab]);

  const locale = language === "ar" ? "ar" : language === "ur" ? "ur" : "en-US";

  return (
    <div className="min-h-screen bg-sand pb-24">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button onClick={() => router.back()} aria-label={dict.events.back} className="text-ink/60 hover:text-ink p-1">
          <ChevronLeft className="w-7 h-7 rtl:rotate-180" />
        </button>
        <h1 className="font-display text-xl">{dict.events.title}</h1>
      </header>

      <main className="max-w-md mx-auto px-5 pb-16">
        <div className="grid grid-cols-2 gap-2 mb-5">
          {(["upcoming", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 rounded-xl text-base font-medium transition-colors ${
                tab === t ? "bg-night-teal text-sand" : "bg-card text-ink/70"
              }`}
            >
              {t === "upcoming" ? dict.events.upcoming : dict.events.past}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-card/60 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-center text-ink/60 text-lg py-12">{dict.events.empty}</p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="bg-card rounded-2xl p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-night-teal/10 flex flex-col items-center justify-center">
                    <span className="text-xs text-night-teal font-medium">
                      {new Date(event.event_date + "T12:00:00Z").toLocaleDateString(locale, { month: "short" })}
                    </span>
                    <span className="font-display text-xl text-night-teal">
                      {new Date(event.event_date + "T12:00:00Z").getUTCDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-lg">{event.title}</h2>
                    {event.description && (
                      <p className="text-sm text-ink/60 mt-0.5 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-3 text-sm text-ink/70">
                  {event.start_time && (
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      {event.start_time.substring(0, 5)}
                      {event.end_time ? ` – ${event.end_time.substring(0, 5)}` : ""}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      {event.location}
                    </span>
                  )}
                  {event.speaker && (
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4 flex-shrink-0" />
                      {event.speaker}
                    </span>
                  )}
                </div>

                {event.registration_url && tab === "upcoming" && (
                  <a
                    href={event.registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center mt-4 py-3 rounded-full bg-night-teal text-sand font-medium"
                  >
                    {dict.events.register}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <FooterNav />
    </div>
  );
}
