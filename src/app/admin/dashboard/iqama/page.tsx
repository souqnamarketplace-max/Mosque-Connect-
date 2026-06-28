"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { useAdminSession } from "@/lib/hooks/useAdminSession";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";

interface IqamaRow {
  id: string;
  iqama_date: string;
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  is_jumuah: boolean;
  jumuah_khutbah_time: string | null;
}

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

export default function IqamaTimesAdminPage() {
  const { ready, mosques, selectedMosqueId, setSelectedMosqueId, logout, isPlatformAdmin } = useAdminSession();

  const [editDate, setEditDate] = useState(todayStr());
  const [existingRow, setExistingRow] = useState<IqamaRow | null>(null);
  const [form, setForm] = useState({ fajr: "", dhuhr: "", asr: "", maghrib: "", isha: "", jumuahKhutbahTime: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  const loadIqamaForDate = useCallback(async () => {
    if (!selectedMosqueId) return;
    const res = await fetch(`/api/admin/iqama-times?mosque_id=${selectedMosqueId}&from=${editDate}&to=${editDate}`);
    const rows: IqamaRow[] = await res.json();
    const row = rows[0] ?? null;
    setExistingRow(row);
    setForm({
      fajr: row?.fajr?.substring(0, 5) ?? "",
      dhuhr: row?.dhuhr?.substring(0, 5) ?? "",
      asr: row?.asr?.substring(0, 5) ?? "",
      maghrib: row?.maghrib?.substring(0, 5) ?? "",
      isha: row?.isha?.substring(0, 5) ?? "",
      jumuahKhutbahTime: row?.jumuah_khutbah_time?.substring(0, 5) ?? "",
    });
  }, [selectedMosqueId, editDate]);

  useEffect(() => {
    if (ready) loadIqamaForDate();
  }, [ready, loadIqamaForDate]);

  const isFriday = new Date(editDate + "T12:00:00Z").getUTCDay() === 5;

  const handleSave = async () => {
    if (!selectedMosqueId) return;
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/admin/iqama-times", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mosqueId: selectedMosqueId,
        date: editDate,
        fajr: form.fajr,
        dhuhr: form.dhuhr,
        asr: form.asr,
        maghrib: form.maghrib,
        isha: form.isha,
        jumuahKhutbahTime: isFriday && form.jumuahKhutbahTime ? form.jumuahKhutbahTime : null,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Failed to save" });
      return;
    }
    if (data.warnings?.length > 0) {
      setMessage({ type: "warning", text: data.warnings.join("; ") });
    } else {
      setMessage({ type: "success", text: "Iqama times saved" });
    }
    loadIqamaForDate();
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
      {mosques.length === 0 ? (
        <p className="text-center text-ink/60 py-12">No mosques assigned to your account yet.</p>
      ) : (
        <div>
          <h2 className="font-display text-lg mb-3">Iqama Times</h2>

          <input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="w-full bg-card rounded-xl px-4 py-3 mb-4 border border-sand-dark"
          />

          {isFriday && (
            <div className="bg-gold/10 border border-gold/30 rounded-xl px-4 py-2 mb-4 text-sm text-ink/80">
              This is a Friday — Dhuhr below represents the Jumu&apos;ah Iqama time.
            </div>
          )}

          <div className="bg-card rounded-2xl divide-y divide-sand-dark">
            {(["fajr", "dhuhr", "asr", "maghrib", "isha"] as const).map((prayer) => (
              <div key={prayer} className="flex items-center justify-between p-4">
                <span className="capitalize">{prayer === "dhuhr" && isFriday ? "Jumu'ah Iqama" : prayer}</span>
                <input
                  type="time"
                  value={form[prayer]}
                  onChange={(e) => setForm((f) => ({ ...f, [prayer]: e.target.value }))}
                  className="bg-sand-dark/30 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
            ))}
            {isFriday && (
              <div className="flex items-center justify-between p-4">
                <span>Khutbah Start (optional)</span>
                <input
                  type="time"
                  value={form.jumuahKhutbahTime}
                  onChange={(e) => setForm((f) => ({ ...f, jumuahKhutbahTime: e.target.value }))}
                  className="bg-sand-dark/30 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
            )}
          </div>

          {message && (
            <div
              className={`mt-3 rounded-xl px-4 py-2.5 text-sm flex items-start gap-2 ${
                message.type === "success"
                  ? "bg-night-teal/10 text-night-teal"
                  : message.type === "warning"
                  ? "bg-gold/10 text-gold-light"
                  : "bg-urgent/10 text-urgent"
              }`}
            >
              {message.type !== "success" && <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              {message.text}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-full bg-night-teal text-sand font-medium mt-4 disabled:opacity-50 hover:bg-night-teal-light transition-colors"
          >
            {saving ? "Saving…" : existingRow ? "Update Iqama Times" : "Save Iqama Times"}
          </button>
        </div>
      )}
    </AdminDashboardShell>
  );
}
