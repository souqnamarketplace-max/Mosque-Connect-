"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Radio, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface LiveStream {
  id: string;
  title: string | null;
  source: "youtube" | "facebook" | "custom";
  stream_url?: string;
  recording_url?: string;
  ended_at?: string;
}

interface LiveStreamData {
  live: LiveStream | null;
  recordings: LiveStream[];
}

/** Converts a YouTube watch/share URL into an embeddable URL. Falls back to
 * the original URL for sources that can't be reliably auto-embedded. */
function toEmbedUrl(url: string, source: string): string | null {
  if (source === "youtube") {
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=0` : null;
  }
  if (source === "facebook") {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
  }
  return null; // custom sources are linked out to, not embedded, since format varies
}

export default function LiveStreamPage() {
  const router = useRouter();
  const { dict, language } = useI18n();
  const [data, setData] = useState<LiveStreamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/live-streams")
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const locale = language === "ar" ? "ar" : language === "ur" ? "ur" : "en-US";

  if (loading) {
    return <div className="min-h-screen bg-sand p-6 text-center text-ink/60 text-lg">{dict.common.loading}</div>;
  }

  const embedUrl = data?.live ? toEmbedUrl(data.live.stream_url ?? "", data.live.source) : null;

  return (
    <div className="min-h-screen bg-sand">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button onClick={() => router.back()} aria-label={dict.liveStream.back} className="text-ink/60 hover:text-ink p-1">
          <ChevronLeft className="w-7 h-7 rtl:rotate-180" />
        </button>
        <h1 className="font-display text-xl">{dict.liveStream.title}</h1>
      </header>

      <main className="max-w-md mx-auto px-5 pb-16">
        {data?.live ? (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center gap-1.5 bg-urgent text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-card animate-pulse" />
                {dict.liveStream.live}
              </span>
              {data.live.title && <span className="text-sm text-ink/70">{data.live.title}</span>}
            </div>

            {embedUrl ? (
              <div className="aspect-video rounded-2xl overflow-hidden bg-black">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  title={data.live.title ?? "Live stream"}
                />
              </div>
            ) : (
              <a
                href={data.live.stream_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-3 aspect-video rounded-2xl bg-night-teal text-sand"
              >
                <Radio className="w-10 h-10" />
                <span className="font-medium text-lg">{dict.liveStream.watchLive}</span>
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Radio className="w-10 h-10 text-ink/60" />
            <p className="text-ink/60 text-lg">{dict.liveStream.offline}</p>
          </div>
        )}

        {data && data.recordings.length > 0 && (
          <div>
            <h2 className="text-base font-medium text-ink/60 mb-3">{dict.liveStream.recordings}</h2>
            <div className="space-y-2">
              {data.recordings.map((rec) => (
                <a
                  key={rec.id}
                  href={rec.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-card rounded-xl p-4"
                >
                  <div className="w-10 h-10 rounded-full bg-night-teal/10 flex items-center justify-center flex-shrink-0">
                    <Play className="w-4 h-4 text-night-teal" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{rec.title ?? dict.liveStream.title}</p>
                    {rec.ended_at && (
                      <p className="text-xs text-ink/60">
                        {new Date(rec.ended_at).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
