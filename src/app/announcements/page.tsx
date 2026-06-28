"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Pin, FileText, Link as LinkIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Announcement {
  id: string;
  category: string;
  title: string;
  body: string | null;
  image_url: string | null;
  pdf_url: string | null;
  link_url: string | null;
  is_pinned: boolean;
  publish_at: string;
  deceased_name: string | null;
  burial_time: string | null;
  burial_location: string | null;
  couple_names: string | null;
  ceremony_time: string | null;
  ceremony_location: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-sage/20 text-sage",
  prayer_changes: "bg-gold/20 text-gold",
  emergency: "bg-urgent/20 text-urgent",
  community_news: "bg-night-teal/10 text-night-teal",
  ramadan: "bg-night-teal/10 text-night-teal",
  eid: "bg-gold/20 text-gold",
  funeral: "bg-ink/10 text-ink/70",
  nikah: "bg-gold/20 text-gold",
};

export default function AnnouncementsPage() {
  const router = useRouter();
  const { dict, language } = useI18n();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/announcements")
      .then((res) => res.json())
      .then(setAnnouncements)
      .finally(() => setLoading(false));
  }, []);

  const locale = language === "ar" ? "ar" : language === "ur" ? "ur" : "en-US";
  const categoryLabels = dict.announcements.categories as Record<string, string>;

  return (
    <div className="min-h-screen bg-sand">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button
          onClick={() => router.back()}
          aria-label={dict.announcements.back}
          className="text-ink/60 hover:text-ink p-1"
        >
          <ChevronLeft className="w-7 h-7 rtl:rotate-180" />
        </button>
        <h1 className="font-display text-xl">{dict.announcements.title}</h1>
      </header>

      <main className="max-w-md mx-auto px-5 pb-16">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-card/60 animate-pulse" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <p className="text-center text-ink/60 text-lg py-12">{dict.announcements.empty}</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="bg-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  {a.is_pinned && <Pin className="w-3.5 h-3.5 text-gold flex-shrink-0" />}
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      CATEGORY_COLORS[a.category] ?? "bg-sand-dark text-ink/60"
                    }`}
                  >
                    {categoryLabels[a.category] ?? a.category}
                  </span>
                  <span className="text-xs text-ink/60 ms-auto">
                    {new Date(a.publish_at).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                  </span>
                </div>
                <h2 className="font-display text-lg mb-1">{a.title}</h2>
                {a.body && <p className="text-sm text-ink/70 leading-relaxed">{a.body}</p>}

                {a.category === "funeral" && (
                  <div className="bg-sand-dark/30 rounded-xl p-3 mt-2 space-y-1 text-sm">
                    {a.deceased_name && (
                      <p>
                        <span className="text-ink/60">{dict.announcements.funeralDetails.deceasedName}:</span>{" "}
                        <span className="font-medium">{a.deceased_name}</span>
                      </p>
                    )}
                    {a.burial_time && (
                      <p>
                        <span className="text-ink/60">{dict.announcements.funeralDetails.burialTime}:</span>{" "}
                        {new Date(a.burial_time).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    )}
                    {a.burial_location && (
                      <p>
                        <span className="text-ink/60">{dict.announcements.funeralDetails.burialLocation}:</span>{" "}
                        {a.burial_location}
                      </p>
                    )}
                  </div>
                )}

                {a.category === "nikah" && (
                  <div className="bg-gold/10 rounded-xl p-3 mt-2 space-y-1 text-sm">
                    {a.couple_names && (
                      <p>
                        <span className="text-ink/60">{dict.announcements.nikahDetails.coupleNames}:</span>{" "}
                        <span className="font-medium">{a.couple_names}</span>
                      </p>
                    )}
                    {a.ceremony_time && (
                      <p>
                        <span className="text-ink/60">{dict.announcements.nikahDetails.ceremonyTime}:</span>{" "}
                        {new Date(a.ceremony_time).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    )}
                    {a.ceremony_location && (
                      <p>
                        <span className="text-ink/60">{dict.announcements.nikahDetails.ceremonyLocation}:</span>{" "}
                        {a.ceremony_location}
                      </p>
                    )}
                  </div>
                )}
                {a.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image_url} alt="" className="w-full rounded-xl mt-3 object-cover" />
                )}
                <div className="flex gap-3 mt-3">
                  {a.pdf_url && (
                    <a
                      href={a.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-night-teal underline"
                    >
                      <FileText className="w-4 h-4" /> PDF
                    </a>
                  )}
                  {a.link_url && (
                    <a
                      href={a.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-night-teal underline"
                    >
                      <LinkIcon className="w-4 h-4" /> Link
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
