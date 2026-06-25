import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOnboardingState } from "@/lib/onboardingState";
import PrayerCountdownWidget from "@/components/PrayerCountdownWidget";
import EmergencyBanner from "@/components/EmergencyBanner";
import DailyDuaCard from "@/components/DailyDuaCard";
import QuickActionsGrid from "@/components/QuickActionsGrid";
import DeviceInitializer from "@/components/DeviceInitializer";

export default async function HomePage() {
  const { mosqueId } = await getOnboardingState();

  // No mosque selected yet — send to onboarding, per Functional Spec 1.3.
  if (!mosqueId) {
    redirect("/onboarding/language");
  }

  const supabase = await createServerSupabaseClient();
  const { data: mosque } = await supabase
    .from("mosques")
    .select("id, name, address")
    .eq("id", mosqueId)
    .single();

  // The cookie pointed at a mosque that no longer exists/is inactive — restart onboarding
  // rather than showing a broken Home Screen.
  if (!mosque) {
    redirect("/onboarding/language");
  }

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-sand">
      <DeviceInitializer />
      <header className="px-5 pt-6 pb-2 text-center relative">
        <Link
          href="/settings"
          aria-label="Settings"
          className="absolute right-5 top-6 text-ink/40 hover:text-ink/70"
        >
          <Settings className="w-5 h-5" />
        </Link>
        <p className="text-xs uppercase tracking-widest text-sage">{todayLabel}</p>
        <h1 className="font-display text-2xl mt-1">{mosque.name}</h1>
        {mosque.address && <p className="text-xs text-ink/50 mt-0.5">{mosque.address}</p>}
      </header>

      <main className="max-w-md mx-auto px-5 pb-16">
        <EmergencyBanner mosqueId={mosque.id} />

        <section className="py-4">
          <PrayerCountdownWidget mosqueId={mosque.id} />
        </section>

        <section className="mb-6">
          <QuickActionsGrid />
        </section>

        <section className="mb-6">
          <DailyDuaCard />
        </section>
      </main>
    </div>
  );
}
