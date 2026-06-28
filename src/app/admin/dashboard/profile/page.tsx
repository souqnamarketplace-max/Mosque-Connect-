"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminSession } from "@/lib/hooks/useAdminSession";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";

interface MosqueProfileForm {
  description: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  officeHours: string;
  donationLink: string;
}

const EMPTY_FORM: MosqueProfileForm = {
  description: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  officeHours: "",
  donationLink: "",
};

export default function MosqueProfileAdminPage() {
  const { ready, mosques, selectedMosqueId, setSelectedMosqueId, logout, isPlatformAdmin } = useAdminSession();
  const [form, setForm] = useState<MosqueProfileForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!selectedMosqueId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/mosque-profile?mosque_id=${selectedMosqueId}`);
    if (res.ok) {
      const data = await res.json();
      setForm({
        description: data.description ?? "",
        address: data.address ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        website: data.website ?? "",
        officeHours: data.office_hours ?? "",
        donationLink: data.donation_link ?? "",
      });
    }
    setLoading(false);
  }, [selectedMosqueId]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const handleSave = async () => {
    if (!selectedMosqueId) return;
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/admin/mosque-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mosqueId: selectedMosqueId, ...form }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
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
      <h2 className="font-display text-lg mb-4">Mosque Profile</h2>

      {loading ? (
        <p className="text-center text-ink/60 py-8">Loading…</p>
      ) : (
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
          </Field>
          <Field label="Address">
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
          </Field>
          <Field label="Website">
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
          </Field>
          <Field label="Office Hours">
            <input
              type="text"
              placeholder="e.g. Mon–Fri 9am–5pm"
              aria-label="e.g. Mon–Fri 9am–5pm"
              value={form.officeHours}
              onChange={(e) => setForm((f) => ({ ...f, officeHours: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
          </Field>
          <Field label="Donation Link (external, optional)">
            <input
              type="url"
              value={form.donationLink}
              onChange={(e) => setForm((f) => ({ ...f, donationLink: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
          </Field>

          {saved && <p role="status" className="text-night-teal text-sm">Profile saved.</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-full bg-night-teal text-sand font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </div>
      )}
    </AdminDashboardShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-ink/60 mb-1">{label}</label>
      {children}
    </div>
  );
}
