/**
 * Open-Meteo's `weather_code` field returns a WMO code from a known,
 * documented subset (not all 100 WMO codes — Open-Meteo only ever returns
 * these specific values). Mapped here to translation keys (so the UI text
 * follows whatever language is selected, per the project's hard
 * trilingual requirement) and a simple icon name our IconForWeather
 * component understands.
 */

export type WeatherIconName = "sun" | "cloud-sun" | "cloud" | "fog" | "drizzle" | "rain" | "snow" | "thunderstorm";

export interface WeatherCodeInfo {
  icon: WeatherIconName;
  labelKey: string;
}

const WMO_CODE_MAP: Record<number, WeatherCodeInfo> = {
  0: { icon: "sun", labelKey: "clearSky" },
  1: { icon: "cloud-sun", labelKey: "mainlyClear" },
  2: { icon: "cloud-sun", labelKey: "partlyCloudy" },
  3: { icon: "cloud", labelKey: "overcast" },
  45: { icon: "fog", labelKey: "fog" },
  48: { icon: "fog", labelKey: "fog" },
  51: { icon: "drizzle", labelKey: "lightDrizzle" },
  53: { icon: "drizzle", labelKey: "drizzle" },
  55: { icon: "drizzle", labelKey: "denseDrizzle" },
  56: { icon: "drizzle", labelKey: "freezingDrizzle" },
  57: { icon: "drizzle", labelKey: "freezingDrizzle" },
  61: { icon: "rain", labelKey: "lightRain" },
  63: { icon: "rain", labelKey: "rain" },
  65: { icon: "rain", labelKey: "heavyRain" },
  66: { icon: "rain", labelKey: "freezingRain" },
  67: { icon: "rain", labelKey: "freezingRain" },
  71: { icon: "snow", labelKey: "lightSnow" },
  73: { icon: "snow", labelKey: "snow" },
  75: { icon: "snow", labelKey: "heavySnow" },
  77: { icon: "snow", labelKey: "snowGrains" },
  80: { icon: "rain", labelKey: "rainShowers" },
  81: { icon: "rain", labelKey: "rainShowers" },
  82: { icon: "rain", labelKey: "violentRainShowers" },
  85: { icon: "snow", labelKey: "snowShowers" },
  86: { icon: "snow", labelKey: "heavySnowShowers" },
  95: { icon: "thunderstorm", labelKey: "thunderstorm" },
  96: { icon: "thunderstorm", labelKey: "thunderstormHail" },
  99: { icon: "thunderstorm", labelKey: "thunderstormHail" },
};

export function getWeatherCodeInfo(code: number): WeatherCodeInfo {
  return WMO_CODE_MAP[code] ?? { icon: "cloud", labelKey: "overcast" };
}
