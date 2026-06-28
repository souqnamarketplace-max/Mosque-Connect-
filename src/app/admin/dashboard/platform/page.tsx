"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Copy, Check, Ban, Filter } from "lucide-react";
import PaginationControls from "@/components/admin/PaginationControls";

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

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

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
    const invitesParams = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (statusFilter) invitesParams.set("status", statusFilter);

    const [mosquesRes, invitesRes] = await Promise.all([
      fetch("/api/admin/mosques"),
      fetch(`/api/admin/invites?${invitesParams}`),
    ]);
    const mosquesData = await mosquesRes.json();
    setMosques(mosquesData.mosques ?? []);
    if (invitesRes.ok) {
      const data = await invitesRes.json();
      setInvites(data.items);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } else {
      setInvites([]);
    }
  }, [page, statusFilter]);

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
    return <div className="min-h-screen flex items-center justify-center text-ink/60">Checking access…</div>;
  }

  return (
    <div className="min-h-screen bg-sand">
      <header className="bg-night-teal text-sand px-5 py-4">
        <h1 className="font-display text-lg">Platform Administration</h1>
        <p className="text-sand/60 text-sm">Invite mosque administrators</p>
      </header>

      <main className="max-w-md mx-auto px-5 py-6">
        {lastAcceptUrl && (
          <div role="status" className="bg-night-teal/10 border border-night-teal/30 rounded-xl p-4 mb-5">
            <p className="text-sm font-medium mb-1">Invite created. Share this link:</p>
            <p className="text-xs break-all bg-card rounded-lg p-2 mb-2">{lastAcceptUrl}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(lastAcceptUrl);
              }}
              className="text-sm text-night-teal underline"
            >
              Copy link
            </button>
            <p className="text-xs text-ink/60 mt-2">
              Email delivery isn&apos;t set up yet — for now, send this link to the admin directly (e.g. via text or
              email).
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg">Mosque Admin Invites</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters((s) => !s)}
              aria-label={showFilters ? "Hide filters" : "Show filters"}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium ${
                statusFilter ? "bg-night-teal text-sand" : "bg-card text-ink/70 border border-sand-dark"
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowForm((s) => !s)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-night-teal text-sand text-sm font-medium"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? "Cancel" : "Invite"}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-card rounded-2xl p-3 mb-4">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
              className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="">All invites</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="revoked">Revoked</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        )}

        {showForm && (
          <div className="bg-card rounded-2xl p-4 mb-5 space-y-3">
            <input
              type="email"
              placeholder="admin@email.com"
              aria-label="Admin email address"
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

            {error && <p className="text-urgent text-sm" role="alert">{error}</p>}

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
          <p className="text-center text-ink/60 py-8">{statusFilter ? "No invites match this filter." : "No invites yet."}</p>
        ) : (
          <>
            <div className="space-y-2">
              {invites.map((invite) => (
                <div key={invite.id} className="bg-card rounded-xl p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{invite.email}</p>
                    <p className="text-xs text-ink/60">
                      {invite.mosque_ids.length} mosque(s) · {invite.role} ·{" "}
                      <span
                        className={
                          invite.status === "pending"
                            ? "text-gold"
                            : invite.status === "accepted"
                            ? "text-night-teal"
                            : "text-ink/60"
                        }
                      >
                        {invite.status}
                      </span>
                    </p>
                  </div>
                  <button onClick={() => copyLink(invite)} className="text-ink/60 hover:text-night-teal p-1">
                    {copiedId === invite.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  {invite.status === "pending" && (
                    <button onClick={() => handleRevoke(invite.id)} className="text-ink/60 hover:text-urgent p-2">
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <PaginationControls page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} />
          </>
        )}
      </main>
    </div>
  );
}
