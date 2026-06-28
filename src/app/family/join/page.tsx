"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

function JoinFamilyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dict } = useI18n();
  const token = searchParams.get("token");

  const [familyName, setFamilyName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("This invite link is missing a token.");
      setLoading(false);
      return;
    }
    fetch(`/api/family/accept-invite?token=${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) setError(data.error ?? "Invalid invite");
        else setFamilyName(data.familyName);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/family/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, displayName }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to join family");
      return;
    }
    router.push("/family");
  };

  if (loading) {
    return <div className="min-h-screen bg-sand flex items-center justify-center text-ink/60">{dict.common.loading}</div>;
  }

  if (error && !familyName) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center p-6 text-center">
        <p className="text-ink/70 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand flex flex-col">
      <main className="flex-1 max-w-md mx-auto w-full px-6 pt-16 pb-8 flex flex-col">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-night-teal/10 flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-night-teal" />
          </div>
          <h1 className="font-display text-2xl text-center">{dict.family.joinTitle}</h1>
          <p className="text-ink/60 text-sm mt-1 text-center">
            {familyName ?? dict.family.joinSubtitle}
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <input
            type="text"
            required
            placeholder={dict.family.yourName}
              aria-label={dict.family.yourName}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-card border border-sand-dark focus:outline-none focus:ring-2 focus:ring-night-teal"
          />

          {error && <p className="text-urgent text-sm bg-urgent/10 rounded-lg px-3 py-2" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-full bg-night-teal text-sand font-medium disabled:opacity-50"
          >
            {submitting ? "Joining…" : dict.family.joinButton}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function JoinFamilyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sand" />}>
      <JoinFamilyContent />
    </Suspense>
  );
}
