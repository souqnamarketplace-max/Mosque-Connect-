"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, X, CalendarDays, Filter } from "lucide-react";
import { useAdminSession } from "@/lib/hooks/useAdminSession";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import PaginationControls from "@/components/admin/PaginationControls";

interface EventRow {
  id: string;
  title: string;
  category: string;
  event_date: string;
  start_time: string | null;
  location: string | null;
  speaker: string | null;
}

const CATEGORIES = ["friday_program", "youth_program", "ramadan_program", "community", "other"] as const;

function todayStr() {
  return new Date().toISOString().substring(0, 10);
}

export default function EventsAdminPage() {
  const { ready, mosques, selectedMosqueId, setSelectedMosqueId, logout, isPlatformAdmin } = useAdminSession();
  const [items, setItems] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "community" as (typeof CATEGORIES)[number],
    eventDate: todayStr(),
    startTime: "",
    endTime: "",
    location: "",
    speaker: "",
    registrationUrl: "",
  });

  const load = useCallback(async () => {
    if (!selectedMosqueId) return;
    setLoading(true);
    const params = new URLSearchParams({ mosque_id: selectedMosqueId, page: String(page), pageSize: "20" });
    if (categoryFilter) params.set("category", categoryFilter);
    const res = await fetch(`/api/admin/events?${params}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [selectedMosqueId, page, categoryFilter]);

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
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mosqueId: selectedMosqueId, ...form }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create event");
      return;
    }
    setForm({
      title: "",
      description: "",
      category: "community",
      eventDate: todayStr(),
      startTime: "",
      endTime: "",
      location: "",
      speaker: "",
      registrationUrl: "",
    });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/admin/events?id=${id}`, { method: "DELETE" });
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
        <h2 className="font-display text-lg">Events</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters((s) => !s)}
            aria-label={showFilters ? "Hide filters" : "Show filters"}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium ${
              categoryFilter ? "bg-night-teal text-sand" : "bg-white text-ink/70 border border-sand-dark"
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-night-teal text-sand text-sm font-medium"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "New"}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-2xl p-3 mb-4">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by category"
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5 text-sm"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl p-4 mb-5 space-y-3">
          <input
            type="text"
            placeholder="Event title"
              aria-label="Event title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          <textarea
            placeholder="Description (optional)"
              aria-label="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
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
            type="date"
            value={form.eventDate}
            onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              className="bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              className="bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
          </div>
          <input
            type="text"
            placeholder="Location (optional)"
              aria-label="Location (optional)"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          <input
            type="text"
            placeholder="Speaker (optional)"
              aria-label="Speaker (optional)"
            value={form.speaker}
            onChange={(e) => setForm((f) => ({ ...f, speaker: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          <input
            type="url"
            placeholder="Registration link (optional)"
              aria-label="Registration link (optional)"
            value={form.registrationUrl}
            onChange={(e) => setForm((f) => ({ ...f, registrationUrl: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          {error && <p className="text-urgent text-sm" role="alert">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full py-3 rounded-full bg-night-teal text-sand font-medium disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Event"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-ink/60 py-8">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-center text-ink/60 py-8">{categoryFilter ? "No events match this filter." : "No events yet."}</p>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-4 flex items-start gap-3">
                <CalendarDays className="w-4 h-4 text-night-teal flex-shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-ink/60">
                    {item.event_date} {item.start_time ? `· ${item.start_time.substring(0, 5)}` : ""}
                    {item.location ? ` · ${item.location}` : ""}
                  </p>
                </div>
                <button onClick={() => handleDelete(item.id)} className="text-ink/60 hover:text-urgent p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <PaginationControls page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
        </>
      )}
    </AdminDashboardShell>
  );
}
