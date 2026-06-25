/**
 * Gregorian -> Hijri (Umm al-Qura approximation via the standard tabular
 * "Kuwaiti algorithm"). This is a civil/calculated Hijri date, not a
 * moon-sighting-confirmed date — like most prayer apps, it can be off by a
 * day from local moon-sighting announcements near month boundaries. That's
 * disclosed in the UI as an approximate date, not stated as authoritative.
 */

const HIJRI_MONTH_NAMES_EN = [
  "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
  "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
  "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah",
];

const HIJRI_MONTH_NAMES_AR = [
  "محرم", "صفر", "ربيع الأول", "ربيع الثاني",
  "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
  "رمضان", "شوال", "ذو القعدة", "ذو الحجة",
];

const HIJRI_MONTH_NAMES_UR = [
  "محرم", "صفر", "ربیع الاول", "ربیع الثانی",
  "جمادی الاول", "جمادی الثانی", "رجب", "شعبان",
  "رمضان", "شوال", "ذوالقعدہ", "ذوالحجہ",
];

export interface HijriDate {
  year: number;
  month: number; // 1-12
  day: number;
  monthNameEn: string;
  monthNameAr: string;
  monthNameUr: string;
}

export function gregorianToHijri(date: Date): HijriDate {
  const jd = gregorianToJulianDay(date);
  return julianDayToHijri(jd);
}

function gregorianToJulianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();

  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;

  return (
    d +
    Math.floor((153 * m2 + 2) / 5) +
    365 * y2 +
    Math.floor(y2 / 4) -
    Math.floor(y2 / 100) +
    Math.floor(y2 / 400) -
    32045
  );
}

function julianDayToHijri(jd: number): HijriDate {
  const islamicEpoch = 1948440; // JD of 1 Muharram 1 AH (civil/tabular)
  const daysSinceEpoch = jd - islamicEpoch;

  // 30-year cycle of 10631 days; within a cycle, an 11-leap-year pattern.
  const cycle = Math.floor(daysSinceEpoch / 10631);
  let remaining = daysSinceEpoch % 10631;
  let year = cycle * 30 + 1;

  const leapYears = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];
  for (let yearInCycle = 1; yearInCycle <= 30; yearInCycle++) {
    const yearLength = leapYears.includes(yearInCycle) ? 355 : 354;
    if (remaining < yearLength) {
      year += yearInCycle - 1;
      break;
    }
    remaining -= yearLength;
  }

  const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29 + (isHijriLeapYear(year) ? 1 : 0)];
  let month = 1;
  for (const len of monthLengths) {
    if (remaining < len) break;
    remaining -= len;
    month++;
  }

  const day = remaining + 1;

  return {
    year,
    month,
    day,
    monthNameEn: HIJRI_MONTH_NAMES_EN[month - 1],
    monthNameAr: HIJRI_MONTH_NAMES_AR[month - 1],
    monthNameUr: HIJRI_MONTH_NAMES_UR[month - 1],
  };
}

function isHijriLeapYear(year: number): boolean {
  const yearInCycle = ((year - 1) % 30) + 1;
  return [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29].includes(yearInCycle);
}

export function formatHijriDate(hijri: HijriDate, language: "en" | "ar" | "ur"): string {
  const monthName = language === "ar" ? hijri.monthNameAr : language === "ur" ? hijri.monthNameUr : hijri.monthNameEn;
  const yearSuffix = language === "ar" ? "هـ" : language === "ur" ? "ھ" : "AH";
  return `${hijri.day} ${monthName} ${hijri.year} ${yearSuffix}`;
}
