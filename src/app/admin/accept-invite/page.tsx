"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

interface InviteDetails {
  email: string;
  role: string;
  mosques: Array<{ id: string; name: string }>;
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("This invite link is missing a token.");
      setLoading(false);
      return;
    }
    fetch(`/api/admin/accept-invite?token=${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Invalid invite");
        } else {
          setInvite(data);
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to accept invite");
      return;
    }
    router.push("/admin/dashboard");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sand/60">Loading invite…</div>;
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-night-teal flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sand text-lg mb-2">This invite couldn&apos;t be opened</p>
          <p className="text-sand/60 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-night-teal flex flex-col">
      <main className="flex-1 max-w-md mx-auto w-full px-6 pt-16 pb-8 flex flex-col">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-sand/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-7 h-7 text-gold" />
          </div>
          <h1 className="font-display text-2xl text-sand text-center">You&apos;ve been invited</h1>
          <p className="text-sand/60 text-sm mt-1 text-center">{invite?.email}</p>
        </div>

        <div className="bg-sand/10 rounded-2xl p-4 mb-6">
          <p className="text-sand/70 text-sm mb-1">You&apos;ll manage:</p>
          {invite?.mosques.map((m) => (
            <p key={m.id} className="text-sand font-medium">
              • {m.name}
            </p>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sand/70 text-sm mb-1.5">Create a password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-sand/10 text-sand focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="block text-sand/70 text-sm mb-1.5">Confirm password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-sand/10 text-sand focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          {error && <p className="text-urgent text-sm bg-urgent/10 rounded-lg px-3 py-2" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-full bg-gold text-ink font-medium disabled:opacity-50"
          >
            {submitting ? "Setting up your account…" : "Accept & Create Account"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-night-teal" />}>
      <AcceptInviteContent />
    </Suspense>
  );
}
