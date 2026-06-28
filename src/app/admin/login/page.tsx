"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Login failed");
      setLoading(false);
      return;
    }

    router.push("/admin/dashboard");
  };

  return (
    <div className="min-h-screen bg-night-teal flex flex-col">
      <header className="max-w-md mx-auto w-full px-6 pt-6">
        <Link href="/settings" className="text-sand/60 hover:text-sand" aria-label="Back">
          <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
        </Link>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-6 pt-12 pb-8 flex flex-col">
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-sand/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-7 h-7 text-gold" />
          </div>
          <h1 className="font-display text-2xl text-sand">Mosque Admin</h1>
          <p className="text-sand/60 text-sm mt-1">Sign in to manage your mosque</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sand/70 text-sm mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-sand/10 text-sand placeholder:text-sand/60 focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="admin@yourmosque.org"
            />
          </div>
          <div>
            <label className="block text-sand/70 text-sm mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-sand/10 text-sand placeholder:text-sand/60 focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-urgent text-sm bg-urgent/10 rounded-lg px-3 py-2" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-gold text-ink font-medium disabled:opacity-50 hover:bg-gold-light transition-colors"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sand/60 text-xs mt-8">
          Don&apos;t have admin access yet? Contact your platform administrator for an invite.
        </p>
      </main>
    </div>
  );
}
