import { Coordinates, CalculationMethod, CalculationParameters, PrayerTimes, Madhab, HighLatitudeRule } from "adhan";

export type CalcMethodCode = "ISNA" | "MWL" | "EGYPT" | "MAKKAH" | "KARACHI" | "TEHRAN" | "JAFARI";
export type AsrMethodCode = "STANDARD" | "HANAFI";
export type HighLatRuleCode = "NONE" | "MIDNIGHT" | "ONE_SEVENTH" | "ANGLE_BASED";

function resolveCalculationParams(method: CalcMethodCode): CalculationParameters {
  switch (method) {
    case "ISNA": return CalculationMethod.NorthAmerica();
    case "MWL": return CalculationMethod.MuslimWorldLeague();
    case "EGYPT": return CalculationMethod.Egyptian();
    case "MAKKAH": return CalculationMethod.UmmAlQura();
    case "KARACHI": return CalculationMethod.Karachi();
    case "TEHRAN": return CalculationMethod.Tehran();
    case "JAFARI": return CalculationMethod.Tehran(); // closest available mapping
    default: return CalculationMethod.NorthAmerica();
  }
}

function resolveHighLatRule(rule: HighLatRuleCode) {
  switch (rule) {
    case "NONE": return HighLatitudeRule.recommended;
    case "MIDNIGHT": return HighLatitudeRule.MiddleOfTheNight;
    case "ONE_SEVENTH": return HighLatitudeRule.SeventhOfTheNight;
    case "ANGLE_BASED": return HighLatitudeRule.TwilightAngle;
    default: return HighLatitudeRule.recommended;
  }
}

export interface MosqueCalcConfig {
  latitude: number;
  longitude: number;
  calculationMethod: CalcMethodCode;
  asrJuristicMethod: AsrMethodCode;
  highLatitudeRule: HighLatRuleCode;
}

export interface DailyPrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

/**
 * Computes Adhan times for a given mosque + date.
 * Validation rule enforced here (see Functional Spec 2.2.1):
 * monotonic order fajr < sunrise < dhuhr < asr < maghrib < isha.
 * Throws if that invariant is violated, so callers never persist bad data.
 */
export function calculatePrayerTimes(config: MosqueCalcConfig, date: Date): DailyPrayerTimes {
  const coordinates = new Coordinates(config.latitude, config.longitude);
  const params = resolveCalculationParams(config.calculationMethod);
  params.madhab = config.asrJuristicMethod === "HANAFI" ? Madhab.Hanafi : Madhab.Shafi;
  params.highLatitudeRule = resolveHighLatRule(config.highLatitudeRule);

  const prayerTimes = new PrayerTimes(coordinates, date, params);

  const result: DailyPrayerTimes = {
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha,
  };

  const order = [result.fajr, result.sunrise, result.dhuhr, result.asr, result.maghrib, result.isha];
  for (let i = 1; i < order.length; i++) {
    if (order[i].getTime() <= order[i - 1].getTime()) {
      throw new Error(
        `Prayer time calculation produced non-monotonic order at index ${i} for date ${date.toISOString()}`
      );
    }
  }

  return result;
}

/** Formats a Date as a Postgres TIME string (HH:MM:SS) in UTC, since the
 * calculation library returns absolute UTC instants for the given calendar date. */
export function toTimeString(d: Date): string {
  return d.toISOString().substring(11, 19);
}
