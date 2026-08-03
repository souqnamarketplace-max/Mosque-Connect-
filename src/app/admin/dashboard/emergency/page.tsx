"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, X, AlertTriangle } from "lucide-react";
import { useAdminSession } from "@/lib/hooks/useAdminSession";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import PaginationControls from "@/components/admin/PaginationControls";

interface EmergencyNotification {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export default function EmergencyAdminPage() {
  const { ready, mosques, selectedMosqueId, setSelectedMosqueId, logout, isPlatformAdmin } = useAdminSession();
  const [items, setItems] = useState<EmergencyNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [form, setForm] = useState({ title: "", message: "", expiresAt: "" });

  const load = useCallback(async () => {
    if (!selectedMosqueId) return;
    setLoading(true);
    const params = new URLSearchParams({ mosque_id: selectedMosqueId, page: String(page), pageSize: "20" });
    const res = await fetch(`/api/admin/emergency-notifications?${params}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [selectedMosqueId, page]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const handleCreate = async () => {
    if (!selectedMosqueId || !form.title.trim() || !form.message.trim()) {
      setError("Title and message are required");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/emergency-notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mosqueId: selectedMosqueId,
        title: form.title,
        message: form.message,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to send emergency notification");
      return;
    }
    setForm({ title: "", message: "", expiresAt: "" });
    setShowForm(false);
    load();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch("/api/admin/emergency-notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg">Emergency Notifications</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-urgent text-white text-sm font-medium"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "New Alert"}
        </button>
      </div>

      <div className="bg-urgent/10 border border-urgent/30 rounded-xl px-4 py-2.5 mb-4 text-sm text-ink/80">
        Emergency alerts push immediately to every subscriber of this mosque — they bypass quiet hours and
        notification opt-outs. Use only for genuine emergencies (closures, safety incidents, urgent changes).
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl p-4 mb-5 space-y-3">
          <input
            type="text"
            placeholder="Alert title"
            aria-label="Alert title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          <textarea
            placeholder="Message"
            aria-label="Message"
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            rows={3}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          <div>
            <label className="block text-xs text-ink/60 mb-1">Expires (optional)</label>
            <input
              type="datetime-local"
              aria-label="Expires at"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
          </div>
          {error && <p className="text-urgent text-sm" role="alert">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full py-3 rounded-full bg-urgent text-white font-medium disabled:opacity-50"
          >
            {saving ? "Sending…" : "Send Emergency Alert"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-ink/60 py-8">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-center text-ink/60 py-8">No emergency notifications yet.</p>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="bg-card rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-urgent flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-ink/60">{item.message}</p>
                  </div>
                  <button
                    onClick={() => toggleActive(item.id, item.is_active)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                      item.is_active ? "bg-urgent/10 text-urgent" : "bg-sand-dark text-ink/60"
                    }`}
                  >
                    {item.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <PaginationControls page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
        </>
      )}
    </AdminDashboardShell>
  );
}
