"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Pin, X } from "lucide-react";
import { useAdminSession } from "@/lib/hooks/useAdminSession";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";

interface Announcement {
  id: string;
  category: string;
  title: string;
  body: string | null;
  is_pinned: boolean;
  publish_at: string;
  expires_at: string | null;
}

const CATEGORIES = [
  "general",
  "prayer_changes",
  "emergency",
  "community_news",
  "ramadan",
  "eid",
  "funeral",
  "nikah",
] as const;

export default function AnnouncementsAdminPage() {
  const { ready, mosques, selectedMosqueId, setSelectedMosqueId, logout, isPlatformAdmin } = useAdminSession();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    category: "general" as (typeof CATEGORIES)[number],
    title: "",
    body: "",
    isPinned: false,
    deceasedName: "",
    burialTime: "",
    burialLocation: "",
    coupleNames: "",
    ceremonyTime: "",
    ceremonyLocation: "",
  });

  const load = useCallback(async () => {
    if (!selectedMosqueId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/announcements?mosque_id=${selectedMosqueId}`);
    setItems(res.ok ? await res.json() : []);
    setLoading(false);
  }, [selectedMosqueId]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const handleCreate = async () => {
    if (!selectedMosqueId || !form.title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mosqueId: selectedMosqueId, ...form }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create announcement");
      return;
    }
    setForm({
      category: "general",
      title: "",
      body: "",
      isPinned: false,
      deceasedName: "",
      burialTime: "",
      burialLocation: "",
      coupleNames: "",
      ceremonyTime: "",
      ceremonyLocation: "",
    });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`/api/admin/announcements?id=${id}`, { method: "DELETE" });
    load();
  };

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-ink/50">Checking access…</div>;
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
        <h2 className="font-display text-lg">Announcements</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-night-teal text-sand text-sm font-medium"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "New"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl p-4 mb-5 space-y-3">
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as typeof form.category }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          <textarea
            placeholder="Body (optional)"
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            rows={3}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />

          {form.category === "funeral" && (
            <div className="space-y-2 bg-sand-dark/20 rounded-lg p-3">
              <input
                type="text"
                placeholder="Name of the deceased"
                value={form.deceasedName}
                onChange={(e) => setForm((f) => ({ ...f, deceasedName: e.target.value }))}
                className="w-full bg-white rounded-lg px-3 py-2"
              />
              <input
                type="datetime-local"
                value={form.burialTime}
                onChange={(e) => setForm((f) => ({ ...f, burialTime: e.target.value }))}
                className="w-full bg-white rounded-lg px-3 py-2"
              />
              <input
                type="text"
                placeholder="Burial location"
                value={form.burialLocation}
                onChange={(e) => setForm((f) => ({ ...f, burialLocation: e.target.value }))}
                className="w-full bg-white rounded-lg px-3 py-2"
              />
            </div>
          )}

          {form.category === "nikah" && (
            <div className="space-y-2 bg-sand-dark/20 rounded-lg p-3">
              <input
                type="text"
                placeholder="Names of the couple"
                value={form.coupleNames}
                onChange={(e) => setForm((f) => ({ ...f, coupleNames: e.target.value }))}
                className="w-full bg-white rounded-lg px-3 py-2"
              />
              <input
                type="datetime-local"
                value={form.ceremonyTime}
                onChange={(e) => setForm((f) => ({ ...f, ceremonyTime: e.target.value }))}
                className="w-full bg-white rounded-lg px-3 py-2"
              />
              <input
                type="text"
                placeholder="Ceremony location"
                value={form.ceremonyLocation}
                onChange={(e) => setForm((f) => ({ ...f, ceremonyLocation: e.target.value }))}
                className="w-full bg-white rounded-lg px-3 py-2"
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPinned}
              onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
            />
            Pin to top
          </label>
          {error && <p className="text-urgent text-sm">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full py-3 rounded-full bg-night-teal text-sand font-medium disabled:opacity-50"
          >
            {saving ? "Posting…" : "Post Announcement"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-ink/50 py-8">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-center text-ink/50 py-8">No announcements yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {item.is_pinned && <Pin className="w-3.5 h-3.5 text-gold" />}
                  <span className="text-xs text-ink/50">{item.category.replace("_", " ")}</span>
                </div>
                <p className="font-medium">{item.title}</p>
                {item.body && <p className="text-sm text-ink/60 line-clamp-2 mt-0.5">{item.body}</p>}
              </div>
              <button onClick={() => handleDelete(item.id)} className="text-ink/30 hover:text-urgent p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </AdminDashboardShell>
  );
}
