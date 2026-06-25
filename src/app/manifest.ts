import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Masjid Connect",
    short_name: "Masjid Connect",
    description: "Prayer times, Athan, dua reminders, and community updates from your mosque.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f2e9",
    theme_color: "#15433d",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
