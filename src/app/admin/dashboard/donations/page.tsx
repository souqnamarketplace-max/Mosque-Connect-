"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, X, HandCoins } from "lucide-react";
import { useAdminSession } from "@/lib/hooks/useAdminSession";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";

interface Campaign {
  id: string;
  category: string;
  title: string;
  description: string | null;
  goal_amount: number | null;
  raised_amount: number;
  currency: string;
  is_active: boolean;
}

const CATEGORIES = ["general", "mosque_operations", "ramadan_campaign", "building_fund", "community_support"] as const;

export default function DonationsAdminPage() {
  const { ready, mosques, selectedMosqueId, setSelectedMosqueId, logout, isPlatformAdmin } = useAdminSession();
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    category: "general" as (typeof CATEGORIES)[number],
    title: "",
    description: "",
    goalAmount: "",
  });

  const load = useCallback(async () => {
    if (!selectedMosqueId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/donation-campaigns?mosque_id=${selectedMosqueId}`);
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
    const res = await fetch("/api/admin/donation-campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mosqueId: selectedMosqueId,
        category: form.category,
        title: form.title,
        description: form.description || undefined,
        goalAmount: form.goalAmount ? parseFloat(form.goalAmount) : undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create campaign");
      return;
    }
    setForm({ category: "general", title: "", description: "", goalAmount: "" });
    setShowForm(false);
    load();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch("/api/admin/donation-campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
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
        <h2 className="font-display text-lg">Donation Campaigns</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-night-teal text-sand text-sm font-medium"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "New"}
        </button>
      </div>

      <div className="bg-gold/10 border border-gold/30 rounded-xl px-4 py-2.5 mb-4 text-sm text-ink/80">
        Note: online payment processing is set up separately. This creates the campaign that donors will see;
        actual payments will start flowing in once payment integration is connected.
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
            placeholder="Campaign title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          <input
            type="number"
            placeholder="Goal amount in CAD (optional)"
            value={form.goalAmount}
            onChange={(e) => setForm((f) => ({ ...f, goalAmount: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          {error && <p className="text-urgent text-sm">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full py-3 rounded-full bg-night-teal text-sand font-medium disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Campaign"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-ink/50 py-8">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-center text-ink/50 py-8">No campaigns yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl p-4">
              <div className="flex items-start gap-3">
                <HandCoins className="w-4 h-4 text-night-teal flex-shrink-0 mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-ink/60">
                    {item.currency} {item.raised_amount.toLocaleString()}
                    {item.goal_amount ? ` / ${item.goal_amount.toLocaleString()}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => toggleActive(item.id, item.is_active)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                    item.is_active ? "bg-night-teal/10 text-night-teal" : "bg-sand-dark text-ink/50"
                  }`}
                >
                  {item.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminDashboardShell>
  );
}
