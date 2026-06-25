const en = {
  common: {
    back: "Back",
    continue: "Continue",
    saving: "Saving…",
    loading: "Loading…",
    retry: "Retry",
    notSet: "Not set",
    settings: "Settings",
  },
  onboarding: {
    language: {
      title: "Choose Your Language",
      subtitle: "Select the language you'd like to use",
    },
    province: {
      title: "Select Your Province",
      subtitle: "Where are you located?",
    },
    city: {
      title: "Select Your City",
      subtitle: "Choose your nearest city",
      empty: "No cities available for this province yet.",
    },
    mosque: {
      title: "Select Your Mosque",
      subtitle: "Choose your preferred mosque",
      empty: "No mosques available for this city yet.",
      settingUp: "Setting up your home screen…",
    },
  },
  home: {
    prayerUnavailable: "Prayer times unavailable",
    untilAdhan: "until Adhan",
    untilIqama: "until Iqama",
    todaysSchedule: "Today's Schedule",
    khutbahBegins: "Khutbah begins at",
    jumuah: "Jumu'ah",
    noMorePrayers: "No more prayers scheduled today.",
    quickActions: {
      qibla: "Qibla",
      events: "Events",
      donate: "Donate",
      liveStream: "Live Stream",
      announcements: "Announcements",
      mosqueProfile: "Mosque Profile",
    },
  },
  prayers: {
    fajr: "Fajr",
    dhuhr: "Dhuhr",
    asr: "Asr",
    maghrib: "Maghrib",
    isha: "Isha",
  },
  settings: {
    title: "Settings",
    locationMosque: "Location & Mosque",
    mosque: "Mosque",
    city: "City",
    province: "Province",
    languageSection: "Language",
    appLanguage: "App Language",
    notifications: "Notifications",
    athanSettings: "Athan Settings",
    duaReminderSettings: "Dua Reminder Settings",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    mosqueAdmin: "Mosque Administration",
    adminLogin: "Admin Login",
  },
  athan: {
    title: "Athan Settings",
    enable: "Enable Athan",
    voice: "Athan Voice",
    volume: "Volume",
    alertMode: "Alert Mode",
    sound: "Sound",
    vibrationOnly: "Vibration Only",
    notificationOnly: "Notification Only",
    muted: "Muted",
    perPrayer: "Per-Prayer Settings",
  },
  duaReminders: {
    title: "Dua Reminders",
    enable: "Enable Reminders",
    language: "Language",
    categories: "Reminder Categories",
  },
} as const;

export default en;

/** Recursively widens literal string types to `string` so other language
 * dictionaries can satisfy this shape without matching English's exact text. */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };
export type TranslationDict = Widen<typeof en>;
