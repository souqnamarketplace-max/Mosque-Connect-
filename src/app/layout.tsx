import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDict } from "@/lib/i18n/getServerDict";
import { getOnboardingState } from "@/lib/onboardingState";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import ThemeSync from "@/components/ThemeSync";

export const metadata: Metadata = {
  title: "Masjid Connect",
  description: "Prayer times, Athan, dua reminders, and community updates from your mosque.",
  manifest: "/manifest.webmanifest", // served by src/app/manifest.ts (Next.js generates this route automatically)
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Masjid Connect",
  },
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#114d44",
  width: "device-width",
  initialScale: 1,
  // Capacitor WebViews and notched phones benefit from safe-area support;
  // viewport-fit=cover lets our CSS env(safe-area-inset-*) rules (see
  // FooterNav) actually take effect instead of being clipped.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { language, dir } = await getServerDict();
  const { theme } = await getOnboardingState();

  // "light"/"dark" are known server-side from the cookie, so the correct
  // class is present on first paint (no flash of the wrong theme). "system"
  // can't be resolved server-side (no access to the OS preference), so it
  // renders with no class here and ThemeSync (client-only) applies the
  // actual OS preference immediately on mount and keeps it in sync if the
  // OS preference changes while the app is open.
  const themeClass = theme === "dark" ? "dark" : theme === "light" ? "light" : "";

  return (
    <html lang={language} dir={dir} className={`h-full antialiased ${themeClass}`}>
      <body className="min-h-full flex flex-col">
        <I18nProvider>{children}</I18nProvider>
        <ServiceWorkerRegister />
        <ThemeSync serverTheme={theme} />
      </body>
    </html>
  );
}
