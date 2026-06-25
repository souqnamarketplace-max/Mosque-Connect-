"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface AthanVoice {
  id: string;
  name: string;
  audio_url: string;
  is_default: boolean;
}

interface AthanPrefs {
  athan_enabled: boolean;
  athan_voice_id: string | null;
  volume: number;
  alert_mode: "sound" | "vibration_only" | "notification_only" | "muted";
  per_prayer_overrides: Record<string, { enabled?: boolean; alert_mode?: string }>;
}

const PRAYERS: Array<{ code: string; label: string }> = [
  { code: "fajr", label: "Fajr" },
  { code: "dhuhr", label: "Dhuhr" },
  { code: "asr", label: "Asr" },
  { code: "maghrib", label: "Maghrib" },
  { code: "isha", label: "Isha" },
];

const ALERT_MODES: Array<{ value: AthanPrefs["alert_mode"]; label: string }> = [
  { value: "sound", label: "Sound" },
  { value: "vibration_only", label: "Vibration Only" },
  { value: "notification_only", label: "Notification Only" },
  { value: "muted", label: "Muted" },
];

export default function AthanSettingsPage() {
  const [voices, setVoices] = useState<AthanVoice[]>([]);
  const [prefs, setPrefs] = useState<AthanPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      await fetch("/api/device/init", { method: "POST" }); // ensure cookie exists first
      const [voicesRes, prefsRes] = await Promise.all([
        fetch("/api/athan-voices"),
        fetch("/api/athan-preferences"),
      ]);
      setVoices(await voicesRes.json());
      setPrefs(await prefsRes.json());
      setLoading(false);
    }
    load();
  }, []);

  const save = useCallback((patch: Partial<AthanPrefs>) => {
    setPrefs((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaving(true);
    fetch("/api/athan-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).finally(() => setSaving(false));
  }, []);

  const togglePerPrayer = (code: string, enabled: boolean) => {
    if (!prefs) return;
    const updated = { ...prefs.per_prayer_overrides, [code]: { ...prefs.per_prayer_overrides[code], enabled } };
    save({ per_prayer_overrides: updated });
  };

  if (loading || !prefs) {
    return <div className="p-6 text-center text-ink/50">Loading settings…</div>;
  }

  return (
    <div className="min-h-screen bg-sand">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <Link href="/" aria-label="Back" className="text-ink/60 hover:text-ink">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="font-display text-xl">Athan Settings</h1>
        {saving && <span className="text-xs text-ink/40 ml-auto">Saving…</span>}
      </header>

      <main className="max-w-md mx-auto px-5 pb-16 space-y-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-4">
          <span className="font-medium">Enable Athan</span>
          <ToggleSwitch checked={prefs.athan_enabled} onChange={(v) => save({ athan_enabled: v })} />
        </div>

        {/* Voice selector */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-2">Athan Voice</h2>
          <div className="bg-white rounded-2xl divide-y divide-sand-dark">
            {voices.map((voice) => (
              <label key={voice.id} className="flex items-center justify-between p-4 cursor-pointer">
                <span>{voice.name}</span>
                <input
                  type="radio"
                  name="voice"
                  checked={prefs.athan_voice_id === voice.id || (!prefs.athan_voice_id && voice.is_default)}
                  onChange={() => save({ athan_voice_id: voice.id })}
                  className="accent-night-teal"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Volume */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Volume</span>
            <span className="text-ink/50">{Math.round(prefs.volume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={prefs.volume}
            onChange={(e) => save({ volume: parseFloat(e.target.value) })}
            className="w-full accent-night-teal"
          />
        </div>

        {/* Alert mode */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-2">Alert Mode</h2>
          <div className="grid grid-cols-2 gap-2">
            {ALERT_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => save({ alert_mode: mode.value })}
                className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                  prefs.alert_mode === mode.value
                    ? "bg-night-teal text-sand"
                    : "bg-white text-ink/70 hover:bg-sand-dark"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Per-prayer overrides */}
        <div>
          <h2 className="text-sm font-medium text-ink/60 mb-2">Per-Prayer Settings</h2>
          <div className="bg-white rounded-2xl divide-y divide-sand-dark">
            {PRAYERS.map((p) => {
              const enabled = prefs.per_prayer_overrides[p.code]?.enabled ?? true;
              return (
                <div key={p.code} className="flex items-center justify-between p-4">
                  <span>{p.label}</span>
                  <ToggleSwitch checked={enabled} onChange={(v) => togglePerPrayer(p.code, v)} />
                </div>
              );
            })}
          </div>
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
      className={`w-12 h-7 rounded-full transition-colors relative ${checked ? "bg-night-teal" : "bg-sand-dark"}`}
    >
      <span
        className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}
