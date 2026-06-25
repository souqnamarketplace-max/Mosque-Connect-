"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Bell } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { subscribeToPush, getPushPermissionState } from "@/lib/push/subscribeToPush";

interface Prefs {
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  notify_new_announcements: boolean;
  notify_new_events: boolean;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { dict } = useI18n();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionState, setPermissionState] = useState<NotificationPermission | "unsupported">("default");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    async function load() {
      await fetch("/api/auth/ensure-session", { method: "POST" });
      const [prefsRes, permState] = await Promise.all([
        fetch("/api/notification-preferences"),
        getPushPermissionState(),
      ]);
      setPrefs(await prefsRes.json());
      setPermissionState(permState);
      setLoading(false);
    }
    load();
  }, []);

  const save = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => (prev ? { ...prev, ...patch } : prev));
    fetch("/api/notification-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quietHoursStart: patch.quiet_hours_start,
        quietHoursEnd: patch.quiet_hours_end,
        notifyNewAnnouncements: patch.notify_new_announcements,
        notifyNewEvents: patch.notify_new_events,
      }),
    });
  }, []);

  const handleEnablePush = async () => {
    setSubscribing(true);
    const result = await subscribeToPush();
    setSubscribing(false);
    setPermissionState(result === "subscribed" ? "granted" : result === "permission_denied" ? "denied" : "default");
  };

  if (loading || !prefs) {
    return <div className="p-6 text-center text-ink/50">{dict.common.loading}</div>;
  }

  return (
    <div className="min-h-screen bg-sand pb-24">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button onClick={() => router.back()} aria-label={dict.notificationSettings.back} className="text-ink/60 hover:text-ink p-1">
          <ChevronLeft className="w-7 h-7 rtl:rotate-180" />
        </button>
        <h1 className="font-display text-xl">{dict.notificationSettings.title}</h1>
      </header>

      <main className="max-w-md mx-auto px-5 space-y-6">
        {/* Push enable */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <Bell className="w-5 h-5 text-night-teal flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{dict.notificationSettings.enablePush}</p>
              <p className="text-sm text-ink/60">{dict.notificationSettings.enablePushDesc}</p>
            </div>
          </div>

          {permissionState === "unsupported" && (
            <p className="text-sm text-ink/50 bg-sand-dark/30 rounded-lg p-3">{dict.notificationSettings.unsupported}</p>
          )}
          {permissionState === "denied" && (
            <p className="text-sm text-urgent bg-urgent/10 rounded-lg p-3">{dict.notificationSettings.permissionDenied}</p>
          )}
          {permissionState === "granted" && (
            <p className="text-sm text-night-teal bg-night-teal/10 rounded-lg p-3">✓ Enabled</p>
          )}
          {permissionState === "default" && (
            <button
              onClick={handleEnablePush}
              disabled={subscribing}
              className="w-full py-3 rounded-full bg-night-teal text-sand font-medium disabled:opacity-50"
            >
              {subscribing ? "Enabling…" : dict.notificationSettings.enablePush}
            </button>
          )}
        </div>

        {/* Quiet hours */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-1">{dict.notificationSettings.quietHours}</h2>
          <p className="text-xs text-ink/50 mb-2">{dict.notificationSettings.quietHoursDesc}</p>
          <div className="bg-white rounded-2xl p-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink/50 mb-1">{dict.notificationSettings.from}</label>
              <input
                type="time"
                value={prefs.quiet_hours_start ?? ""}
                onChange={(e) => save({ quiet_hours_start: e.target.value })}
                className="w-full bg-sand-dark/30 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/50 mb-1">{dict.notificationSettings.to}</label>
              <input
                type="time"
                value={prefs.quiet_hours_end ?? ""}
                onChange={(e) => save({ quiet_hours_end: e.target.value })}
                className="w-full bg-sand-dark/30 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-2">{dict.notificationSettings.categories}</h2>
          <div className="bg-white rounded-2xl divide-y divide-sand-dark">
            <div className="flex items-center justify-between p-4">
              <span>{dict.notificationSettings.newAnnouncements}</span>
              <ToggleSwitch
                checked={prefs.notify_new_announcements}
                onChange={(v) => save({ notify_new_announcements: v })}
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <span>{dict.notificationSettings.newEvents}</span>
              <ToggleSwitch checked={prefs.notify_new_events} onChange={(v) => save({ notify_new_events: v })} />
            </div>
          </div>
          <p className="text-xs text-ink/40 mt-2">{dict.notificationSettings.emergencyNote}</p>
        </div>
      </main>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${
        checked ? "bg-night-teal" : "bg-sand-dark"
      }`}
    >
      <span
        className={`absolute top-1 ltr:left-1 rtl:right-1 w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? "ltr:translate-x-5 rtl:-translate-x-5" : ""
        }`}
      />
    </button>
  );
}
