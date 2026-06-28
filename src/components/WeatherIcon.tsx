import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, Snowflake, CloudLightning } from "lucide-react";
import type { WeatherIconName } from "@/lib/weatherCodes";

const ICON_MAP: Record<WeatherIconName, typeof Sun> = {
  sun: Sun,
  "cloud-sun": CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: Snowflake,
  thunderstorm: CloudLightning,
};

export default function WeatherIcon({ name, className }: { name: WeatherIconName; className?: string }) {
  const Icon = ICON_MAP[name] ?? Cloud;
  return <Icon className={className} />;
}
