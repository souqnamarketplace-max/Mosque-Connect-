"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Phone, Mail, Globe, Clock, MapPin, Navigation, HandCoins } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface MosqueProfile {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  office_hours: string | null;
  latitude: number | null;
  longitude: number | null;
  donation_link: string | null;
}

export default function MosqueProfilePage() {
  const router = useRouter();
  const { dict } = useI18n();
  const [mosque, setMosque] = useState<MosqueProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mosques/current")
      .then((res) => (res.ok ? res.json() : null))
      .then(setMosque)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-sand p-6 text-center text-ink/60 text-lg">{dict.common.loading}</div>;
  }

  if (!mosque) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center p-6">
        <p className="text-ink/60 text-lg text-center">{dict.common.notSet}</p>
      </div>
    );
  }

  const mapsUrl = mosque.latitude && mosque.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${mosque.latitude},${mosque.longitude}`
    : mosque.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mosque.address)}`
    : null;

  return (
    <div className="min-h-screen bg-sand">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button onClick={() => router.back()} aria-label={dict.common.back} className="text-ink/60 hover:text-ink p-1">
          <ChevronLeft className="w-7 h-7 rtl:rotate-180" />
        </button>
        <h1 className="font-display text-xl">{dict.mosqueProfile.title}</h1>
      </header>

      <main className="max-w-md mx-auto px-5 pb-16 space-y-5">
        {/* Mosque identity */}
        <div className="flex flex-col items-center text-center pt-2 pb-2">
          <div className="w-20 h-20 rounded-2xl bg-night-teal/10 flex items-center justify-center mb-3 overflow-hidden">
            {mosque.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mosque.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-display text-night-teal text-3xl">{mosque.name.charAt(0)}</span>
            )}
          </div>
          <h2 className="font-display text-2xl">{mosque.name}</h2>
        </div>

        {/* About */}
        {mosque.description && (
          <div>
            <h3 className="text-base font-medium text-ink/60 mb-2">{dict.mosqueProfile.about}</h3>
            <p className="text-lg leading-relaxed bg-card rounded-2xl p-4">{mosque.description}</p>
          </div>
        )}

        {/* Big, clear action buttons — senior-friendly */}
        <div className="grid grid-cols-2 gap-3">
          {mosque.phone && (
            <a
              href={`tel:${mosque.phone}`}
              className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-night-teal text-sand active:bg-night-teal-light"
            >
              <Phone className="w-7 h-7" />
              <span className="text-base font-medium">{dict.mosqueProfile.call}</span>
            </a>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-night-teal text-sand active:bg-night-teal-light"
            >
              <Navigation className="w-7 h-7" />
              <span className="text-base font-medium">{dict.mosqueProfile.getDirections}</span>
            </a>
          )}
        </div>

        {/* Contact details */}
        <div>
          <h3 className="text-base font-medium text-ink/60 mb-2">{dict.mosqueProfile.contact}</h3>
          <div className="bg-card rounded-2xl divide-y divide-sand-dark">
            {mosque.address && (
              <InfoRow icon={MapPin} label={dict.mosqueProfile.address} value={mosque.address} />
            )}
            {mosque.phone && <InfoRow icon={Phone} label={dict.mosqueProfile.phone} value={mosque.phone} />}
            {mosque.email && <InfoRow icon={Mail} label={dict.mosqueProfile.email} value={mosque.email} />}
            {mosque.website && (
              <InfoRow icon={Globe} label={dict.mosqueProfile.website} value={mosque.website} isLink />
            )}
            {mosque.office_hours && (
              <InfoRow icon={Clock} label={dict.mosqueProfile.officeHours} value={mosque.office_hours} />
            )}
          </div>
        </div>

        {/* Donate */}
        <Link
          href="/donate"
          className="flex items-center justify-center gap-2 w-full py-4 rounded-full bg-gold text-ink font-medium text-lg active:bg-gold-light"
        >
          <HandCoins className="w-5 h-5" />
          {dict.mosqueProfile.donate}
        </Link>
      </main>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  isLink,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  isLink?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <Icon className="w-5 h-5 text-night-teal flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-ink/60">{label}</p>
        {isLink ? (
          <a
            href={value.startsWith("http") ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base text-night-teal underline"
          >
            {value}
          </a>
        ) : (
          <p className="text-base">{value}</p>
        )}
      </div>
    </div>
  );
}
