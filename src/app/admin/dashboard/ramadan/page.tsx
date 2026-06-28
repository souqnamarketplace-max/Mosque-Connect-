"use client";

import { useEffect, useState, useCallback } from "react";
import { Moon } from "lucide-react";
import { useAdminSession } from "@/lib/hooks/useAdminSession";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import { gregorianToHijri } from "@/lib/hijriDate";

interface RamadanDay {
  id: string;
  islamic_day: number;
  gregorian_date: string;
  suhoor_end: string;
  iftar_time: string;
  taraweeh_time: string | null;
}

export default function RamadanAdminPage() {
  const { ready, mosques, selectedMosqueId, setSelectedMosqueId, logout, isPlatformAdmin } = useAdminSession();
  const [days, setDays] = useState<RamadanDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentHijriYear = gregorianToHijri(new Date()).year;
  const [form, setForm] = useState({
    ramadanYearHijri: currentHijriYear,
    startGregorianDate: "",
    taraweehTime: "",
  });

  const load = useCallback(async () => {
    if (!selectedMosqueId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/ramadan-schedule?mosque_id=${selectedMosqueId}&year=${form.ramadanYearHijri}`);
    setDays(res.ok ? await res.json() : []);
    setLoading(false);
  }, [selectedMosqueId, form.ramadanYearHijri]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const handleGenerate = async () => {
    if (!selectedMosqueId || !form.startGregorianDate) {
      setError("Start date (1st of Ramadan) is required");
      return;
    }
    setGenerating(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/admin/ramadan-schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mosqueId: selectedMosqueId, ...form }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to generate schedule");
      return;
    }
    setSuccess(`Generated ${data.daysGenerated} days. Admins can adjust individual Suhoor/Iftar times below if needed.`);
    load();
  };

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-ink/60">Checking access…</div>;
  }

  return (
    <AdminDashboardShell
      mosques={mosques}
      selectedMosqueId={selectedMosqueId}
      setSelectedMosqueId={setSelectedMosqueId}
      logout={logout}
      isPlatformAdmin={isPlatformAdmin}
    >
      <h2 className="font-display text-lg mb-4">Ramadan Schedule</h2>

      <div className="bg-card rounded-2xl p-4 mb-5 space-y-3">
        <p className="text-sm text-ink/60">
          Auto-generate all 30 days from your mosque&apos;s prayer calculation settings. Suhoor End defaults to
          Fajr Adhan time and Iftar defaults to Maghrib Adhan time — adjust individual days below if your mosque
          follows a different convention.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Hijri year (e.g. 1448)"
              aria-label="Hijri year (e.g. 1448)"
            value={form.ramadanYearHijri}
            onChange={(e) => setForm((f) => ({ ...f, ramadanYearHijri: Number(e.target.value) }))}
            className="bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          <input
            type="date"
            value={form.startGregorianDate}
            onChange={(e) => setForm((f) => ({ ...f, startGregorianDate: e.target.value }))}
            className="bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
        </div>
        <input
          type="time"
          placeholder="Taraweeh time (optional, applied to all days)"
              aria-label="Taraweeh time (optional, applied to all days)"
          value={form.taraweehTime}
          onChange={(e) => setForm((f) => ({ ...f, taraweehTime: e.target.value }))}
          className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
        />
        {error && <p className="text-urgent text-sm" role="alert">{error}</p>}
        {success && <p className="text-night-teal text-sm">{success}</p>}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-night-teal text-sand font-medium disabled:opacity-50"
        >
          <Moon className="w-4 h-4" />
          {generating ? "Generating…" : "Generate 30-Day Schedule"}
        </button>
      </div>

      {loading ? (
        <p className="text-center text-ink/60 py-8">Loading…</p>
      ) : days.length > 0 ? (
        <div className="space-y-1.5">
          {days.map((day) => (
            <div key={day.id} className="bg-card rounded-xl p-3 flex items-center justify-between text-sm">
              <span className="font-medium">Day {day.islamic_day}</span>
              <span className="text-ink/60">{day.gregorian_date}</span>
              <span className="tabular-nums">
                {day.suhoor_end.substring(0, 5)} / {day.iftar_time.substring(0, 5)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </AdminDashboardShell>
  );
}
