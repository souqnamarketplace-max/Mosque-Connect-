"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, X, Trash2, CalendarPlus, Filter } from "lucide-react";
import { useAdminSession } from "@/lib/hooks/useAdminSession";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import PaginationControls from "@/components/admin/PaginationControls";

interface Shift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  capacity: number | null;
}

interface Opportunity {
  id: string;
  title: string;
  category: string;
  shifts: Shift[];
}

const CATEGORIES = ["general", "event_support", "food_service", "cleaning", "administration", "teaching", "fundraising"] as const;

export default function VolunteerAdminPage() {
  const { ready, mosques, selectedMosqueId, setSelectedMosqueId, logout, isPlatformAdmin } = useAdminSession();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingShiftFor, setAddingShiftFor] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "general" as (typeof CATEGORIES)[number],
    coordinatorName: "",
    coordinatorContact: "",
  });

  const [shiftForm, setShiftForm] = useState({ shiftDate: "", startTime: "", endTime: "", capacity: "" });

  const load = useCallback(async () => {
    if (!selectedMosqueId) return;
    setLoading(true);
    const params = new URLSearchParams({ mosque_id: selectedMosqueId, page: String(page), pageSize: "20" });
    if (categoryFilter) params.set("category", categoryFilter);
    const res = await fetch(`/api/admin/volunteer?${params}`);
    if (res.ok) {
      const data = await res.json();
      setOpportunities(data.items);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } else {
      setOpportunities([]);
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
    const res = await fetch("/api/admin/volunteer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mosqueId: selectedMosqueId, ...form }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create opportunity");
      return;
    }
    setForm({ title: "", description: "", category: "general", coordinatorName: "", coordinatorContact: "" });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this opportunity?")) return;
    await fetch(`/api/admin/volunteer?id=${id}`, { method: "DELETE" });
    load();
  };

  const handleAddShift = async (opportunityId: string) => {
    if (!shiftForm.shiftDate || !shiftForm.startTime || !shiftForm.endTime) {
      setError("Date, start time, and end time are required");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/volunteer/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        opportunityId,
        shiftDate: shiftForm.shiftDate,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        capacity: shiftForm.capacity ? Number(shiftForm.capacity) : undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to add shift");
      return;
    }
    setShiftForm({ shiftDate: "", startTime: "", endTime: "", capacity: "" });
    setAddingShiftFor(null);
    load();
  };

  const handleDeleteShift = async (id: string) => {
    await fetch(`/api/admin/volunteer/shifts?id=${id}`, { method: "DELETE" });
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg">Volunteer Opportunities</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters((s) => !s)}
            aria-label={showFilters ? "Hide filters" : "Show filters"}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium ${
              categoryFilter ? "bg-night-teal text-sand" : "bg-card text-ink/70 border border-sand-dark"
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
        <div className="bg-card rounded-2xl p-3 mb-4">
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
        <div className="bg-card rounded-2xl p-4 mb-5 space-y-3">
          <input
            type="text"
            placeholder="Opportunity title"
              aria-label="Opportunity title"
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
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Coordinator name (optional)"
              aria-label="Coordinator name (optional)"
            value={form.coordinatorName}
            onChange={(e) => setForm((f) => ({ ...f, coordinatorName: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          {error && <p className="text-urgent text-sm" role="alert">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full py-3 rounded-full bg-night-teal text-sand font-medium disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Opportunity"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-ink/60 py-8">Loading…</p>
      ) : opportunities.length === 0 ? (
        <p className="text-center text-ink/60 py-8">
          {categoryFilter ? "No opportunities match this filter." : "No opportunities yet."}
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <div key={opp.id} className="bg-card rounded-xl p-4">
                <div className="flex items-start justify-between">
                <p className="font-medium">{opp.title}</p>
                <button onClick={() => handleDelete(opp.id)} className="text-ink/60 hover:text-urgent p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-2 space-y-1">
                {opp.shifts.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between text-xs bg-sand-dark/20 rounded-lg px-2.5 py-1.5">
                    <span>
                      {shift.shift_date} · {shift.start_time.substring(0, 5)}–{shift.end_time.substring(0, 5)}
                      {shift.capacity ? ` · cap ${shift.capacity}` : ""}
                    </span>
                    <button onClick={() => handleDeleteShift(shift.id)} className="text-ink/60 hover:text-urgent">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {addingShiftFor === opp.id ? (
                <div className="mt-2 space-y-2 bg-sand-dark/20 rounded-lg p-3">
                  <input
                    type="date"
                    value={shiftForm.shiftDate}
                    onChange={(e) => setShiftForm((f) => ({ ...f, shiftDate: e.target.value }))}
                    className="w-full bg-card rounded-lg px-3 py-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={shiftForm.startTime}
                      onChange={(e) => setShiftForm((f) => ({ ...f, startTime: e.target.value }))}
                      className="bg-card rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      type="time"
                      value={shiftForm.endTime}
                      onChange={(e) => setShiftForm((f) => ({ ...f, endTime: e.target.value }))}
                      className="bg-card rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <input
                    type="number"
                    placeholder="Capacity (optional)"
              aria-label="Capacity (optional)"
                    value={shiftForm.capacity}
                    onChange={(e) => setShiftForm((f) => ({ ...f, capacity: e.target.value }))}
                    className="w-full bg-card rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => handleAddShift(opp.id)}
                    disabled={saving}
                    className="w-full py-2 rounded-full bg-night-teal text-sand text-sm font-medium disabled:opacity-50"
                  >
                    Add Shift
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingShiftFor(opp.id)}
                  className="flex items-center gap-1.5 text-xs text-night-teal underline mt-2"
                >
                  <CalendarPlus className="w-3 h-3" /> Add Shift
                </button>
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
