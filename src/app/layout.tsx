import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getServerDict } from "@/lib/i18n/getServerDict";

export const metadata: Metadata = {
  title: "Masjid Connect",
  description: "Prayer times, Athan, dua reminders, and community updates from your mosque.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { language, dir } = await getServerDict();

  return (
    <html lang={language} dir={dir} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
