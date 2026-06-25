"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Copy, Check, Ban } from "lucide-react";

interface Mosque {
  id: string;
  name: string;
}

interface Invite {
  id: string;
  email: string;
  mosque_ids: string[];
  role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export default function PlatformAdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastAcceptUrl, setLastAcceptUrl] = useState<string | null>(null);

  const [form, setForm] = useState({ email: "", mosqueIds: [] as string[], role: "admin" as "owner" | "admin" | "editor" });

  useEffect(() => {
    fetch("/api/admin/session")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.replace("/admin/login");
          return;
        }
        if (!data.isPlatformAdmin) {
          router.replace("/admin/dashboard");
          return;
        }
        setIsPlatformAdmin(true);
        setChecking(false);
      });
  }, [router]);

  const load = useCallback(async () => {
    const [mosquesRes, invitesRes] = await Promise.all([
      fetch("/api/admin/mosques"),
      fetch("/api/admin/invites"),
    ]);
    const mosquesData = await mosquesRes.json();
    setMosques(mosquesData.mosques ?? []);
    setInvites(invitesRes.ok ? await invitesRes.json() : []);
  }, []);

  useEffect(() => {
    if (isPlatformAdmin) load();
  }, [isPlatformAdmin, load]);

  const toggleMosque = (id: string) => {
    setForm((f) => ({
      ...f,
      mosqueIds: f.mosqueIds.includes(id) ? f.mosqueIds.filter((m) => m !== id) : [...f.mosqueIds, id],
    }));
  };

  const handleCreateInvite = async () => {
    if (!form.email.trim() || form.mosqueIds.length === 0) {
      setError("Email and at least one mosque are required");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to create invite");
      return;
    }
    setLastAcceptUrl(`${window.location.origin}${data.acceptUrl}`);
    setForm({ email: "", mosqueIds: [], role: "admin" });
    setShowForm(false);
    load();
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this invite?")) return;
    await fetch(`/api/admin/invites?id=${id}`, { method: "DELETE" });
    load();
  };

  const copyLink = (invite: Invite) => {
    navigator.clipboard.writeText(invite.email);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-ink/50">Checking access…</div>;
  }

  return (
    <div className="min-h-screen bg-sand">
      <header className="bg-night-teal text-sand px-5 py-4">
        <h1 className="font-display text-lg">Platform Administration</h1>
        <p className="text-sand/60 text-sm">Invite mosque administrators</p>
      </header>

      <main className="max-w-md mx-auto px-5 py-6">
        {lastAcceptUrl && (
          <div className="bg-night-teal/10 border border-night-teal/30 rounded-xl p-4 mb-5">
            <p className="text-sm font-medium mb-1">Invite created. Share this link:</p>
            <p className="text-xs break-all bg-white rounded-lg p-2 mb-2">{lastAcceptUrl}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(lastAcceptUrl);
              }}
              className="text-sm text-night-teal underline"
            >
              Copy link
            </button>
            <p className="text-xs text-ink/50 mt-2">
              Email delivery isn&apos;t set up yet — for now, send this link to the admin directly (e.g. via text or
              email).
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg">Mosque Admin Invites</h2>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-night-teal text-sand text-sm font-medium"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "Invite"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl p-4 mb-5 space-y-3">
            <input
              type="email"
              placeholder="admin@email.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            />

            <p className="text-sm text-ink/60">Assign to mosque(s):</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {mosques.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.mosqueIds.includes(m.id)}
                    onChange={() => toggleMosque(m.id)}
                  />
                  {m.name}
                </label>
              ))}
            </div>

            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as typeof form.role }))}
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
            >
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
              <option value="editor">Editor</option>
            </select>

            {error && <p className="text-urgent text-sm">{error}</p>}

            <button
              onClick={handleCreateInvite}
              disabled={saving}
              className="w-full py-3 rounded-full bg-night-teal text-sand font-medium disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create Invite"}
            </button>
          </div>
        )}

        {invites.length === 0 ? (
          <p className="text-center text-ink/50 py-8">No invites yet.</p>
        ) : (
          <div className="space-y-2">
            {invites.map((invite) => (
              <div key={invite.id} className="bg-white rounded-xl p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{invite.email}</p>
                  <p className="text-xs text-ink/50">
                    {invite.mosque_ids.length} mosque(s) · {invite.role} ·{" "}
                    <span
                      className={
                        invite.status === "pending"
                          ? "text-gold"
                          : invite.status === "accepted"
                          ? "text-night-teal"
                          : "text-ink/40"
                      }
                    >
                      {invite.status}
                    </span>
                  </p>
                </div>
                <button onClick={() => copyLink(invite)} className="text-ink/30 hover:text-night-teal p-1">
                  {copiedId === invite.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                {invite.status === "pending" && (
                  <button onClick={() => handleRevoke(invite.id)} className="text-ink/30 hover:text-urgent p-1">
                    <Ban className="w-4 h-4" />
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
