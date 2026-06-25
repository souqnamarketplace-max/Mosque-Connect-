"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, MapPin } from "lucide-react";
import OnboardingProgress from "@/components/OnboardingProgress";

interface Province {
  id: string;
  code: string;
  name: string;
}

export default function ProvinceSelectionPage() {
  const router = useRouter();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/provinces")
      .then((res) => res.json())
      .then(setProvinces)
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (provinceId: string) => {
    router.push(`/onboarding/city?province_id=${provinceId}`);
  };

  return (
    <div className="min-h-screen bg-sand flex flex-col">
      <header className="max-w-md mx-auto w-full px-6 pt-6">
        <button onClick={() => router.back()} className="text-ink/60 hover:text-ink" aria-label="Back">
          <ChevronLeft className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-6 pt-4 pb-8">
        <OnboardingProgress step={2} total={4} />

        <h1 className="font-display text-2xl text-center mb-2">Select Your Province</h1>
        <p className="text-center text-ink/60 text-sm mb-8">Where are you located?</p>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-14 rounded-xl bg-white/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {provinces.map((province) => (
              <button
                key={province.id}
                onClick={() => handleSelect(province.id)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-white border border-sand-dark hover:border-night-teal transition-colors"
              >
                <span className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-sage" />
                  {province.name}
                </span>
                <span className="text-ink/40 text-sm">{province.code}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
