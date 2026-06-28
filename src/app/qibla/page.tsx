"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Compass as CompassIcon, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { calculateQiblaBearing, calculateQiblaDistanceKm } from "@/lib/qibla";

type PageState = "loading" | "needs_location" | "needs_orientation_permission" | "ready" | "unsupported";

export default function QiblaPage() {
  const router = useRouter();
  const { dict } = useI18n();
  const [state, setState] = useState<PageState>("loading");
  const [qiblaBearing, setQiblaBearing] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [heading, setHeading] = useState<number>(0);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState("unsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const bearing = calculateQiblaBearing(pos.coords.latitude, pos.coords.longitude);
        const distance = calculateQiblaDistanceKm(pos.coords.latitude, pos.coords.longitude);
        setQiblaBearing(bearing);
        setDistanceKm(Math.round(distance));

        const DOE = window.DeviceOrientationEvent as unknown as {
          requestPermission?: () => Promise<"granted" | "denied">;
        };
        if (typeof DOE?.requestPermission === "function") {
          setState("needs_orientation_permission");
        } else if ("DeviceOrientationEvent" in window) {
          setState("ready");
        } else {
          setState("unsupported");
        }
      },
      () => setState("needs_location"),
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (state !== "ready") return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading;
      const compassHeading = webkitHeading ?? (event.alpha != null ? 360 - event.alpha : 0);
      setHeading(compassHeading);
    };

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => window.removeEventListener("deviceorientation", handleOrientation, true);
  }, [state]);

  const requestOrientationPermission = async () => {
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    const result = await DOE.requestPermission?.();
    setState(result === "granted" ? "ready" : "needs_location");
  };

  const arrowRotation = qiblaBearing != null ? qiblaBearing - heading : 0;

  return (
    <div className="min-h-screen bg-sand">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button onClick={() => router.back()} aria-label={dict.qibla.back} className="text-ink/60 hover:text-ink p-1">
          <ChevronLeft className="w-7 h-7 rtl:rotate-180" />
        </button>
        <h1 className="font-display text-xl">{dict.qibla.title}</h1>
      </header>

      <main className="max-w-md mx-auto px-5 pb-16 flex flex-col items-center">
        {state === "loading" && <p className="text-ink/60 text-lg py-16">{dict.common.loading}</p>}

        {state === "needs_location" && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <MapPin className="w-10 h-10 text-ink/60" />
            <p className="text-ink/70 text-lg">{dict.qibla.locationNeeded}</p>
            <button
              onClick={requestLocation}
              className="px-6 py-3.5 rounded-full bg-night-teal text-sand font-medium text-lg"
            >
              {dict.qibla.enableLocation}
            </button>
          </div>
        )}

        {state === "needs_orientation_permission" && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <CompassIcon className="w-10 h-10 text-ink/60" />
            <p className="text-ink/70 text-lg">{dict.qibla.instructions}</p>
            <button
              onClick={requestOrientationPermission}
              className="px-6 py-3.5 rounded-full bg-night-teal text-sand font-medium text-lg"
            >
              {dict.qibla.enableLocation}
            </button>
          </div>
        )}

        {state === "unsupported" && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <CompassIcon className="w-10 h-10 text-ink/60" />
            <p className="text-ink/70 text-lg">{dict.qibla.notSupported}</p>
            {distanceKm != null && (
              <p className="text-ink/60 mt-2">
                {dict.qibla.distanceToKaaba}: {distanceKm.toLocaleString()} km
              </p>
            )}
          </div>
        )}

        {state === "ready" && (
          <>
            <p className="text-center text-ink/60 mb-8">{dict.qibla.instructions}</p>

            <div className="relative w-72 h-72 mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-sand-dark bg-card" />
              <span className="absolute top-3 left-1/2 -translate-x-1/2 text-sm font-medium text-ink/60">N</span>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-sm font-medium text-ink/60">S</span>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink/60">W</span>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink/60">E</span>

              <div
                className="absolute inset-0 flex items-start justify-center pt-6 transition-transform duration-200"
                style={{ transform: `rotate(${arrowRotation}deg)` }}
              >
                <div className="flex flex-col items-center">
                  <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-b-[40px] border-l-transparent border-r-transparent border-b-gold" />
                  <div className="w-2 h-24 bg-gold rounded-full mt-1" />
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-night-teal" />
              </div>
            </div>

            {distanceKm != null && (
              <p className="text-ink/70 text-lg mb-3">
                {dict.qibla.distanceToKaaba}: <span className="font-medium">{distanceKm.toLocaleString()} km</span>
              </p>
            )}
            <p className="text-ink/60 text-sm text-center px-4">{dict.qibla.calibrate}</p>
          </>
        )}
      </main>
    </div>
  );
}
