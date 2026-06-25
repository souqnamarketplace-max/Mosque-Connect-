"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ChevronLeft, Building } from "lucide-react";
import OnboardingProgress from "@/components/OnboardingProgress";

interface City {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

function CitySelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const provinceId = searchParams.get("province_id");

  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!provinceId) {
      router.replace("/onboarding/province");
      return;
    }
    fetch(`/api/cities?province_id=${provinceId}`)
      .then((res) => res.json())
      .then(setCities)
      .finally(() => setLoading(false));
  }, [provinceId, router]);

  const handleSelect = (cityId: string) => {
    router.push(`/onboarding/mosque?city_id=${cityId}`);
  };

  return (
    <div className="min-h-screen bg-sand flex flex-col">
      <header className="max-w-md mx-auto w-full px-6 pt-6">
        <button onClick={() => router.back()} className="text-ink/60 hover:text-ink" aria-label="Back">
          <ChevronLeft className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-6 pt-4 pb-8">
        <OnboardingProgress step={3} total={4} />

        <h1 className="font-display text-2xl text-center mb-2">Select Your City</h1>
        <p className="text-center text-ink/60 text-sm mb-8">Choose your nearest city</p>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-14 rounded-xl bg-white/60 animate-pulse" />
            ))}
          </div>
        ) : cities.length === 0 ? (
          <p className="text-center text-ink/50 py-8">No cities available for this province yet.</p>
        ) : (
          <div className="space-y-2">
            {cities.map((city) => (
              <button
                key={city.id}
                onClick={() => handleSelect(city.id)}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-white border border-sand-dark hover:border-night-teal transition-colors"
              >
                <Building className="w-4 h-4 text-sage" />
                {city.name}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function CitySelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sand" />}>
      <CitySelectionContent />
    </Suspense>
  );
}
