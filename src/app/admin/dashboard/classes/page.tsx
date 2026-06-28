"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, X, Trash2, Users, Filter } from "lucide-react";
import { useAdminSession } from "@/lib/hooks/useAdminSession";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import PaginationControls from "@/components/admin/PaginationControls";

interface ClassItem {
  id: string;
  title: string;
  age_group: string;
  capacity: number | null;
  schedule_note: string | null;
}

interface RosterEntry {
  id: string;
  student_name: string;
  student_age: number | null;
  contact_phone: string | null;
  status: string;
}

export default function ClassesAdminPage() {
  const { ready, mosques, selectedMosqueId, setSelectedMosqueId, logout, isPlatformAdmin } = useAdminSession();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingRosterFor, setViewingRosterFor] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [ageGroupFilter, setAgeGroupFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    instructorName: "",
    ageGroup: "all_ages" as "children" | "youth" | "adults" | "all_ages",
    scheduleNote: "",
    capacity: "",
    location: "",
  });

  const load = useCallback(async () => {
    if (!selectedMosqueId) return;
    setLoading(true);
    const params = new URLSearchParams({ mosque_id: selectedMosqueId, page: String(page), pageSize: "20" });
    if (ageGroupFilter) params.set("age_group", ageGroupFilter);
    const res = await fetch(`/api/admin/classes?${params}`);
    if (res.ok) {
      const data = await res.json();
      setClasses(data.items);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } else {
      setClasses([]);
    }
    setLoading(false);
  }, [selectedMosqueId, page, ageGroupFilter]);

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
    const res = await fetch("/api/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mosqueId: selectedMosqueId,
        ...form,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create class");
      return;
    }
    setForm({ title: "", description: "", instructorName: "", ageGroup: "all_ages", scheduleNote: "", capacity: "", location: "" });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this class?")) return;
    await fetch(`/api/admin/classes?id=${id}`, { method: "DELETE" });
    load();
  };

  const viewRoster = async (classId: string) => {
    setViewingRosterFor(classId);
    const res = await fetch(`/api/admin/classes/roster?class_id=${classId}`);
    setRoster(res.ok ? await res.json() : []);
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg">Islamic Classes</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters((s) => !s)}
            aria-label={showFilters ? "Hide filters" : "Show filters"}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium ${
              ageGroupFilter ? "bg-night-teal text-sand" : "bg-white text-ink/70 border border-sand-dark"
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
            value={ageGroupFilter}
            onChange={(e) => {
              setAgeGroupFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by age group"
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5 text-sm"
          >
            <option value="">All age groups</option>
            <option value="children">Children</option>
            <option value="youth">Youth</option>
            <option value="adults">Adults</option>
            <option value="all_ages">All Ages</option>
          </select>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl p-4 mb-5 space-y-3">
          <input
            type="text"
            placeholder="Class title"
              aria-label="Class title"
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
          <input
            type="text"
            placeholder="Instructor name (optional)"
              aria-label="Instructor name (optional)"
            value={form.instructorName}
            onChange={(e) => setForm((f) => ({ ...f, instructorName: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          <select
            value={form.ageGroup}
            onChange={(e) => setForm((f) => ({ ...f, ageGroup: e.target.value as typeof form.ageGroup }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          >
            <option value="all_ages">All Ages</option>
            <option value="children">Children</option>
            <option value="youth">Youth</option>
            <option value="adults">Adults</option>
          </select>
          <input
            type="text"
            placeholder="Schedule (e.g. Saturdays 10am-12pm)"
              aria-label="Schedule (e.g. Saturdays 10am-12pm)"
            value={form.scheduleNote}
            onChange={(e) => setForm((f) => ({ ...f, scheduleNote: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          <input
            type="text"
            placeholder="Location (optional)"
              aria-label="Location (optional)"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          <input
            type="number"
            placeholder="Capacity (optional, leave blank for unlimited)"
              aria-label="Capacity (optional, leave blank for unlimited)"
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          {error && <p className="text-urgent text-sm" role="alert">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full py-3 rounded-full bg-night-teal text-sand font-medium disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Class"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-ink/60 py-8">Loading…</p>
      ) : classes.length === 0 ? (
        <p className="text-center text-ink/60 py-8">{ageGroupFilter ? "No classes match this filter." : "No classes yet."}</p>
      ) : (
        <>
          <div className="space-y-2">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-white rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{cls.title}</p>
                    <p className="text-xs text-ink/60">
                      {cls.schedule_note} {cls.capacity ? `· capacity ${cls.capacity}` : ""}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(cls.id)} className="text-ink/60 hover:text-urgent p-2">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => viewRoster(cls.id)}
                  className="flex items-center gap-1.5 text-xs text-night-teal underline mt-2"
                >
                  <Users className="w-3 h-3" /> View Roster
                </button>

                {viewingRosterFor === cls.id && (
                  <div className="mt-3 bg-sand-dark/20 rounded-lg p-3 space-y-1.5">
                    {roster.length === 0 ? (
                      <p className="text-xs text-ink/60">No registrations yet.</p>
                    ) : (
                      roster.map((r) => (
                        <div key={r.id} className="flex items-center justify-between text-xs">
                          <span>
                            {r.student_name} {r.student_age ? `(${r.student_age})` : ""}
                          </span>
                          <span className={r.status === "waitlisted" ? "text-gold" : "text-night-teal"}>
                            {r.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <PaginationControls page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
        </>
      )}
    </AdminDashboardShell>
  );
}
