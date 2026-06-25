import Link from "next/link";
import { Settings } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import PrayerCountdownWidget from "@/components/PrayerCountdownWidget";
import EmergencyBanner from "@/components/EmergencyBanner";
import DailyDuaCard from "@/components/DailyDuaCard";
import QuickActionsGrid from "@/components/QuickActionsGrid";
import DeviceInitializer from "@/components/DeviceInitializer";

// Demo default mosque (Lethbridge Islamic Society, seeded per the original
// first-deployment target). A real build reads mosque_id from the onboarding
// cookie instead of hardcoding it — see Functional Spec 1.3.
const DEMO_MOSQUE_ID = "923dff27-c983-4c07-bf19-e94b42961d91";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: mosque } = await supabase
    .from("mosques")
    .select("id, name, address")
    .eq("id", DEMO_MOSQUE_ID)
    .single();

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-sand">
      <DeviceInitializer />
      <header className="px-5 pt-6 pb-2 text-center">
        <p className="text-xs uppercase tracking-widest text-sage">{todayLabel}</p>
        <h1 className="font-display text-2xl mt-1">{mosque?.name ?? "Masjid Connect"}</h1>
        {mosque?.address && <p className="text-xs text-ink/50 mt-0.5">{mosque.address}</p>}
      </header>

      <main className="max-w-md mx-auto px-5 pb-16">
        <EmergencyBanner mosqueId={DEMO_MOSQUE_ID} />

        <section className="py-4">
          <PrayerCountdownWidget mosqueId={DEMO_MOSQUE_ID} />
          <div className="flex justify-center mt-2">
            <Link
              href="/athan-settings"
              className="flex items-center gap-1.5 text-xs text-ink/50 hover:text-ink/80"
            >
              <Settings className="w-3.5 h-3.5" /> Athan Settings
            </Link>
          </div>
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
