"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, X, Search, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Post {
  id: string;
  post_type: "lost" | "found";
  category: string;
  title: string;
  description: string | null;
  image_url: string | null;
  location_note: string | null;
  contact_method: "in_app" | "phone" | "email";
  status: string;
  created_at: string;
  posted_by: string;
}

const CATEGORIES = ["electronics", "keys", "clothing", "jewelry", "documents", "bag", "other"] as const;

export default function LostFoundPage() {
  const router = useRouter();
  const { dict, language } = useI18n();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [form, setForm] = useState({
    postType: "lost" as "lost" | "found",
    category: "other" as (typeof CATEGORIES)[number],
    title: "",
    description: "",
    locationNote: "",
    contactMethod: "in_app" as "in_app" | "phone" | "email",
    contactValue: "",
  });

  const categoryLabels = dict.lostFound.categories as Record<string, string>;
  const locale = language === "ar" ? "ar" : language === "ur" ? "ur" : "en-US";

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/lost-found?status=open");
    setPosts(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/ensure-session", { method: "POST" })
      .then((res) => res.json())
      .then((data) => setCurrentUserId(data.userId ?? null));
    load();
  }, [load]);

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError(dict.lostFound.itemTitle);
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/lost-found", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to post");
      return;
    }
    setForm({
      postType: "lost",
      category: "other",
      title: "",
      description: "",
      locationNote: "",
      contactMethod: "in_app",
      contactValue: "",
    });
    setShowForm(false);
    load();
  };

  const handleResolve = async (id: string) => {
    if (!confirm(dict.lostFound.confirmResolved)) return;
    await fetch("/api/lost-found", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  return (
    <div className="min-h-screen bg-sand pb-24">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button onClick={() => router.back()} aria-label={dict.lostFound.back} className="text-ink/60 hover:text-ink p-1">
          <ChevronLeft className="w-7 h-7 rtl:rotate-180" />
        </button>
        <h1 className="font-display text-xl flex-1">{dict.lostFound.title}</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          aria-label={showForm ? "Cancel" : dict.lostFound.reportLost}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-night-teal text-sand text-sm font-medium"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </header>

      <main className="max-w-md mx-auto px-5">
        {showForm && (
          <div className="bg-card rounded-2xl p-4 mb-5 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {(["lost", "found"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, postType: t }))}
                  className={`py-2.5 rounded-xl text-sm font-medium ${
                    form.postType === t ? "bg-night-teal text-sand" : "bg-sand-dark/30 text-ink/70"
                  }`}
                >
                  {t === "lost" ? dict.lostFound.lost : dict.lostFound.found}
                </button>
              ))}
            </div>

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

            <input
              type="text"
              placeholder={dict.lostFound.itemTitle}
              aria-label={dict.lostFound.itemTitle}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
            <textarea
              placeholder={dict.lostFound.description}
              aria-label={dict.lostFound.description}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />
            <input
              type="text"
              placeholder={dict.lostFound.locationNote}
              aria-label={dict.lostFound.locationNote}
              value={form.locationNote}
              onChange={(e) => setForm((f) => ({ ...f, locationNote: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />

            <p className="text-sm text-ink/60">{dict.lostFound.contactMethod}</p>
            <div className="grid grid-cols-3 gap-2">
              {(["in_app", "phone", "email"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setForm((f) => ({ ...f, contactMethod: m }))}
                  className={`py-2 rounded-lg text-xs font-medium ${
                    form.contactMethod === m ? "bg-night-teal text-sand" : "bg-sand-dark/30 text-ink/70"
                  }`}
                >
                  {m === "in_app" ? dict.lostFound.inApp : m === "phone" ? dict.lostFound.phone : dict.lostFound.email}
                </button>
              ))}
            </div>
            {form.contactMethod !== "in_app" && (
              <input
                type="text"
                placeholder={dict.lostFound.contactValue}
              aria-label={dict.lostFound.contactValue}
                value={form.contactValue}
                onChange={(e) => setForm((f) => ({ ...f, contactValue: e.target.value }))}
                className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
              />
            )}

            {error && <p className="text-urgent text-sm" role="alert">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full py-3 rounded-full bg-night-teal text-sand font-medium disabled:opacity-50"
            >
              {saving ? "Posting…" : dict.lostFound.submit}
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-center text-ink/60 py-8">{dict.common.loading}</p>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Search className="w-8 h-8 text-ink/60" />
            <p className="text-ink/60">{dict.lostFound.empty}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <div key={post.id} className="bg-card rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      post.post_type === "lost" ? "bg-urgent/10 text-urgent" : "bg-night-teal/10 text-night-teal"
                    }`}
                  >
                    {post.post_type === "lost" ? dict.lostFound.lost : dict.lostFound.found}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{post.title}</p>
                    <p className="text-xs text-ink/60">{categoryLabels[post.category]}</p>
                  </div>
                  <span className="text-xs text-ink/60 flex-shrink-0">
                    {new Date(post.created_at).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                  </span>
                </div>
                {post.description && <p className="text-sm text-ink/70 mt-2">{post.description}</p>}
                {post.location_note && (
                  <p className="text-xs text-ink/60 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {post.location_note}
                  </p>
                )}
                {post.posted_by === currentUserId && (
                  <button onClick={() => handleResolve(post.id)} className="text-xs text-night-teal underline mt-2">
                    {dict.lostFound.markResolved}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
