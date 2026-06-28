"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, X, Store, Phone, Globe, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Business {
  id: string;
  business_name: string;
  category: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
}

const CATEGORIES = [
  "restaurant",
  "grocery",
  "retail",
  "professional_services",
  "health_medical",
  "real_estate",
  "automotive",
  "education",
  "beauty_personal_care",
  "other",
] as const;

export default function BusinessDirectoryPage() {
  const router = useRouter();
  const { dict } = useI18n();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    businessName: "",
    category: "other" as (typeof CATEGORIES)[number],
    description: "",
    address: "",
    phone: "",
    website: "",
  });

  const categoryLabels = dict.directory.categories as Record<string, string>;

  const load = useCallback(async () => {
    setLoading(true);
    const params = activeCategory ? `?category=${activeCategory}` : "";
    const res = await fetch(`/api/business-directory${params}`);
    setBusinesses(res.ok ? await res.json() : []);
    setLoading(false);
  }, [activeCategory]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async () => {
    if (!form.businessName.trim()) {
      setError(dict.directory.businessName);
      return;
    }
    setSaving(true);
    setError(null);
    await fetch("/api/auth/ensure-session", { method: "POST" });
    const res = await fetch("/api/business-directory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to submit");
      return;
    }
    setForm({ businessName: "", category: "other", description: "", address: "", phone: "", website: "" });
    setShowForm(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-sand pb-24">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button onClick={() => router.back()} aria-label={dict.directory.back} className="text-ink/60 hover:text-ink p-1">
          <ChevronLeft className="w-7 h-7 rtl:rotate-180" />
        </button>
        <h1 className="font-display text-xl flex-1">{dict.directory.title}</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          aria-label={showForm ? "Cancel" : dict.directory.addBusiness}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-night-teal text-sand text-sm font-medium"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </header>

      <main className="max-w-md mx-auto px-5">
        {submitted && (
          <div role="status" className="bg-night-teal/10 text-night-teal rounded-xl p-3 text-sm mb-4">
            {dict.directory.submittedNote}
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-2xl p-4 mb-5 space-y-3">
            <input
              type="text"
              placeholder={dict.directory.businessName}
              aria-label={dict.directory.businessName}
              value={form.businessName}
              onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as typeof form.category }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabels[c]}
                </option>
              ))}
            </select>
            <textarea
              placeholder={dict.directory.description}
              aria-label={dict.directory.description}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
            <input
              type="text"
              placeholder={dict.directory.address}
              aria-label={dict.directory.address}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
            <input
              type="text"
              placeholder={dict.directory.phone}
              aria-label={dict.directory.phone}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
            <input
              type="url"
              placeholder={dict.directory.website}
              aria-label={dict.directory.website}
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
            {error && <p className="text-urgent text-sm" role="alert">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full py-3 rounded-full bg-night-teal text-sand font-medium disabled:opacity-50"
            >
              {saving ? "Submitting…" : dict.directory.submit}
            </button>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-medium ${
              activeCategory === null ? "bg-night-teal text-sand" : "bg-white text-ink/70"
            }`}
          >
            {dict.directory.filterAll}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-medium ${
                activeCategory === c ? "bg-night-teal text-sand" : "bg-white text-ink/70"
              }`}
            >
              {categoryLabels[c]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-ink/60 py-8">{dict.common.loading}</p>
        ) : businesses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Store className="w-8 h-8 text-ink/60" />
            <p className="text-ink/60">{dict.directory.empty}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {businesses.map((biz) => (
              <div key={biz.id} className="bg-white rounded-xl p-4">
                <p className="font-medium">{biz.business_name}</p>
                <p className="text-xs text-night-teal">{categoryLabels[biz.category]}</p>
                {biz.description && <p className="text-sm text-ink/70 mt-1">{biz.description}</p>}
                <div className="flex flex-col gap-1 mt-2 text-xs text-ink/60">
                  {biz.address && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> {biz.address}
                    </span>
                  )}
                  {biz.phone && (
                    <a href={`tel:${biz.phone}`} className="flex items-center gap-1.5 text-night-teal">
                      <Phone className="w-3 h-3" /> {biz.phone}
                    </a>
                  )}
                  {biz.website && (
                    <a
                      href={biz.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-night-teal"
                    >
                      <Globe className="w-3 h-3" /> {biz.website}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
