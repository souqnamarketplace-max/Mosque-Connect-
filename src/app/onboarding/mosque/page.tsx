"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ChevronLeft, MapPinned } from "lucide-react";
import OnboardingProgress from "@/components/OnboardingProgress";

interface Mosque {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  distanceKm: number | null;
}

function MosqueSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cityId = searchParams.get("city_id");

  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    if (!cityId) {
      router.replace("/onboarding/province");
      return;
    }

    function load(lat?: number, lng?: number) {
      const params = new URLSearchParams({ city_id: cityId! });
      if (lat != null && lng != null) {
        params.set("lat", String(lat));
        params.set("lng", String(lng));
      }
      fetch(`/api/mosques?${params}`)
        .then((res) => res.json())
        .then(setMosques)
        .finally(() => setLoading(false));
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => load(pos.coords.latitude, pos.coords.longitude),
        () => load(), // permission denied or unavailable — load without distance
        { timeout: 5000 }
      );
    } else {
      load();
    }
  }, [cityId, router]);

  const handleSelect = async (mosqueId: string) => {
    setSelecting(mosqueId);
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mosqueId }),
    });
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-sand flex flex-col">
      <header className="max-w-md mx-auto w-full px-6 pt-6">
        <button onClick={() => router.back()} className="text-ink/60 hover:text-ink" aria-label="Back">
          <ChevronLeft className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-6 pt-4 pb-8">
        <OnboardingProgress step={4} total={4} />

        <h1 className="font-display text-2xl text-center mb-2">Select Your Mosque</h1>
        <p className="text-center text-ink/60 text-sm mb-8">Choose your preferred mosque</p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/60 animate-pulse" />
            ))}
          </div>
        ) : mosques.length === 0 ? (
          <p className="text-center text-ink/50 py-8">No mosques available for this city yet.</p>
        ) : (
          <div className="space-y-3">
            {mosques.map((mosque) => (
              <button
                key={mosque.id}
                onClick={() => handleSelect(mosque.id)}
                disabled={selecting !== null}
                className="w-full text-left p-4 rounded-2xl bg-white border border-sand-dark hover:border-night-teal transition-colors disabled:opacity-60"
              >
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-xl bg-sand-dark flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {mosque.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mosque.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display text-night-teal text-lg">
                        {mosque.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-base">{mosque.name}</p>
                    {mosque.address && (
                      <p className="text-xs text-ink/50 flex items-center gap-1 mt-0.5">
                        <MapPinned className="w-3 h-3 flex-shrink-0" />
                        {mosque.address}
                      </p>
                    )}
                  </div>
                  {mosque.distanceKm != null && (
                    <span className="text-xs text-sage font-medium flex-shrink-0">{mosque.distanceKm} km</span>
                  )}
                </div>
                {selecting === mosque.id && (
                  <p className="text-xs text-night-teal mt-2">Setting up your home screen…</p>
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function MosqueSelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sand" />}>
      <MosqueSelectionContent />
    </Suspense>
  );
}
