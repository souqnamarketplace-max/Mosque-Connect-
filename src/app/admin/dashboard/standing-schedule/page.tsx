"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock } from "lucide-react";
import { useAdminSession } from "@/lib/hooks/useAdminSession";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";

interface StandingSchedule {
  id: string;
  effective_from: string;
  effective_until: string | null;
  fajr: string;
  dhuhr: string;
  asr: string;
  isha: string;
  maghrib_fixed: string | null;
  maghrib_offset_minutes: number | null;
  jumuah_1_start: string | null;
  jumuah_1_end: string | null;
  jumuah_2_start: string | null;
  jumuah_2_end: string | null;
  notes: string | null;
}

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

const emptyForm = {
  effectiveFrom: todayStr(),
  fajr: "",
  dhuhr: "",
  asr: "",
  isha: "",
  maghribMode: "offset" as "fixed" | "offset",
  maghribFixed: "",
  maghribOffsetMinutes: "0",
  jumuah1Start: "",
  jumuah1End: "",
  jumuah2Start: "",
  jumuah2End: "",
  notes: "",
};

export default function StandingScheduleAdminPage() {
  const { ready, mosques, selectedMosqueId, setSelectedMosqueId, logout, isPlatformAdmin } = useAdminSession();
  const [schedules, setSchedules] = useState<StandingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!selectedMosqueId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/standing-schedule?mosque_id=${selectedMosqueId}`);
    if (res.ok) setSchedules(await res.json());
    setLoading(false);
  }, [selectedMosqueId]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const handleSave = async () => {
    if (!selectedMosqueId) return;
    if (!form.fajr || !form.dhuhr || !form.asr || !form.isha) {
      setMessage({ type: "error", text: "Fajr, Dhuhr, Asr, and Isha times are required" });
      return;
    }
    if (form.maghribMode === "fixed" && !form.maghribFixed) {
      setMessage({ type: "error", text: "Enter a fixed Maghrib time, or switch to \"minutes after sunset\"" });
      return;
    }

    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/standing-schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mosqueId: selectedMosqueId,
        effectiveFrom: form.effectiveFrom,
        fajr: form.fajr,
        dhuhr: form.dhuhr,
        asr: form.asr,
        isha: form.isha,
        maghribFixed: form.maghribMode === "fixed" ? form.maghribFixed : undefined,
        maghribOffsetMinutes: form.maghribMode === "offset" ? Number(form.maghribOffsetMinutes) : undefined,
        jumuah1Start: form.jumuah1Start || undefined,
        jumuah1End: form.jumuah1End || undefined,
        jumuah2Start: form.jumuah2Start || undefined,
        jumuah2End: form.jumuah2End || undefined,
        notes: form.notes || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Failed to save" });
      return;
    }
    setMessage({ type: "success", text: `Saved — takes effect ${form.effectiveFrom} and applies within 1-2 days via the daily refresh.` });
    setForm(emptyForm);
    load();
  };

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-ink/60">Checking access…</div>;
  }

  return (
    <AdminDashboardShell
      isPlatformAdmin={isPlatformAdmin}
      mosques={mosques}
      selectedMosqueId={selectedMosqueId}
      setSelectedMosqueId={setSelectedMosqueId}
      logout={logout}
    >
      <h2 className="font-display text-lg mb-1">Standing Schedule</h2>
      <p className="text-sm text-ink/60 mb-4">
        A recurring schedule effective from a date until you set a new one — instead of entering iqama times one
        day at a time. The nightly refresh job fills in daily iqama times from whichever schedule is active.
      </p>

      <div className="bg-card rounded-2xl p-4 mb-5 space-y-3">
        <div>
          <label className="block text-xs text-ink/60 mb-1">Effective from</label>
          <input
            type="date"
            value={form.effectiveFrom}
            onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(["fajr", "dhuhr", "asr", "isha"] as const).map((p) => (
            <div key={p}>
              <label className="block text-xs text-ink/60 mb-1 capitalize">{p}</label>
              <input
                type="time"
                value={form[p]}
                onChange={(e) => setForm((f) => ({ ...f, [p]: e.target.value }))}
                className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-xs text-ink/60 mb-1">Maghrib</label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, maghribMode: "offset" }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                form.maghribMode === "offset" ? "bg-night-teal text-sand" : "bg-sand-dark/30 text-ink/70"
              }`}
            >
              Minutes after sunset
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, maghribMode: "fixed" }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                form.maghribMode === "fixed" ? "bg-night-teal text-sand" : "bg-sand-dark/30 text-ink/70"
              }`}
            >
              Fixed time
            </button>
          </div>
          {form.maghribMode === "offset" ? (
            <input
              type="number"
              min={0}
              max={60}
              value={form.maghribOffsetMinutes}
              onChange={(e) => setForm((f) => ({ ...f, maghribOffsetMinutes: e.target.value }))}
              aria-label="Minutes after sunset"
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
          ) : (
            <input
              type="time"
              value={form.maghribFixed}
              onChange={(e) => setForm((f) => ({ ...f, maghribFixed: e.target.value }))}
              aria-label="Fixed Maghrib time"
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
          )}
        </div>

        <div>
          <label className="block text-xs text-ink/60 mb-1">1st Jumu&apos;ah (optional)</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              placeholder="Start"
              aria-label="1st Jumu'ah start"
              value={form.jumuah1Start}
              onChange={(e) => setForm((f) => ({ ...f, jumuah1Start: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
            <input
              type="time"
              placeholder="End"
              aria-label="1st Jumu'ah end"
              value={form.jumuah1End}
              onChange={(e) => setForm((f) => ({ ...f, jumuah1End: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-ink/60 mb-1">2nd Jumu&apos;ah (optional)</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              placeholder="Start"
              aria-label="2nd Jumu'ah start"
              value={form.jumuah2Start}
              onChange={(e) => setForm((f) => ({ ...f, jumuah2Start: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
            <input
              type="time"
              placeholder="End"
              aria-label="2nd Jumu'ah end"
              value={form.jumuah2End}
              onChange={(e) => setForm((f) => ({ ...f, jumuah2End: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
          </div>
        </div>

        <textarea
          placeholder="Notes (optional)"
          aria-label="Notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
        />

        {message && (
          <p className={`text-sm ${message.type === "error" ? "text-urgent" : "text-success"}`} role="alert">
            {message.text}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-full bg-night-teal text-sand font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Standing Schedule"}
        </button>
      </div>

      <h3 className="text-sm font-medium text-ink/60 mb-2">History</h3>
      {loading ? (
        <p className="text-center text-ink/60 py-8">Loading…</p>
      ) : schedules.length === 0 ? (
        <p className="text-center text-ink/60 py-8">No standing schedule set yet.</p>
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => (
            <div key={s.id} className="bg-card rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-night-teal flex-shrink-0 mt-1" />
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-medium">
                    {s.effective_from} {s.effective_until ? `– ${s.effective_until}` : "– ongoing"}
                  </p>
                  <p className="text-ink/60">
                    Fajr {s.fajr.substring(0, 5)} · Dhuhr {s.dhuhr.substring(0, 5)} · Asr {s.asr.substring(0, 5)} ·
                    Maghrib {s.maghrib_fixed ? s.maghrib_fixed.substring(0, 5) : `sunset+${s.maghrib_offset_minutes}min`} · Isha{" "}
                    {s.isha.substring(0, 5)}
                  </p>
                  {s.jumuah_1_start && (
                    <p className="text-ink/60">
                      Jumu&apos;ah 1: {s.jumuah_1_start.substring(0, 5)}
                      {s.jumuah_1_end ? `–${s.jumuah_1_end.substring(0, 5)}` : ""}
                      {s.jumuah_2_start && (
                        <>
                          {" · "}Jumu&apos;ah 2: {s.jumuah_2_start.substring(0, 5)}
                          {s.jumuah_2_end ? `–${s.jumuah_2_end.substring(0, 5)}` : ""}
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminDashboardShell>
  );
}
