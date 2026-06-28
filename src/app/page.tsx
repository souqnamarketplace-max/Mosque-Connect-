import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOnboardingState } from "@/lib/onboardingState";
import { getServerDict } from "@/lib/i18n/getServerDict";
import { gregorianToHijri, formatHijriDate } from "@/lib/hijriDate";
import HomeHeroCard from "@/components/HomeHeroCard";
import PrayerCountdownWidget from "@/components/PrayerCountdownWidget";
import EmergencyBanner from "@/components/EmergencyBanner";
import DailyDuaCard from "@/components/DailyDuaCard";
import DailyContentCard from "@/components/DailyContentCard";
import QuickActionsGrid from "@/components/QuickActionsGrid";
import LatestAnnouncementCard from "@/components/LatestAnnouncementCard";
import UpcomingEventCard from "@/components/UpcomingEventCard";
import DeviceInitializer from "@/components/DeviceInitializer";
import FooterNav from "@/components/FooterNav";

function getGreetingKey(hour: number): "greetingMorning" | "greetingAfternoon" | "greetingEvening" {
  if (hour < 12) return "greetingMorning";
  if (hour < 17) return "greetingAfternoon";
  return "greetingEvening";
}

export default async function HomePage() {
  const { mosqueId } = await getOnboardingState();
  const { language, dict } = await getServerDict();

  if (!mosqueId) {
    redirect("/onboarding/language");
  }

  const supabase = await createServerSupabaseClient();
  const { data: mosque } = await supabase
    .from("mosques")
    .select("id, name, address, cover_image_url")
    .eq("id", mosqueId)
    .single();

  if (!mosque) {
    redirect("/onboarding/language");
  }

  const locale = language === "ar" ? "ar" : language === "ur" ? "ur" : "en-US";
  const now = new Date();
  const todayLabel = now.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });
  const hijri = gregorianToHijri(now);
  const hijriLabel = formatHijriDate(hijri, language);
  const greeting = dict.home[getGreetingKey(now.getHours())];

  return (
    <div className="min-h-screen bg-sand pb-28">
      <DeviceInitializer />

      <main className="max-w-md mx-auto px-4 pt-4">
        <HomeHeroCard
          mosqueId={mosque.id}
          mosqueName={mosque.name}
          coverImageUrl={mosque.cover_image_url}
          greeting={greeting}
          dateLabel={todayLabel}
          hijriLabel={hijriLabel}
        />

        <section className="mt-4">
          <EmergencyBanner mosqueId={mosque.id} />
        </section>

        <section className="py-5 flex justify-center">
          <PrayerCountdownWidget mosqueId={mosque.id} />
        </section>

        <section className="mb-6">
          <QuickActionsGrid />
        </section>

        <section className="mb-4">
          <DailyDuaCard />
        </section>

        <section className="mb-4">
          <DailyContentCard categoryCode="daily_hadith" title={dict.home.dailyHadith} language={language} />
        </section>

        <section className="mb-6">
          <DailyContentCard categoryCode="daily_quran_verse" title={dict.home.quranVerse} language={language} />
        </section>

        <section className="mb-3">
          <LatestAnnouncementCard />
        </section>

        <section className="mb-6">
          <UpcomingEventCard />
        </section>
      </main>

      <FooterNav />
    </div>
  );
}
