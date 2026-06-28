"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, X, Store } from "lucide-react";
import { useAdminSession } from "@/lib/hooks/useAdminSession";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import PaginationControls from "@/components/admin/PaginationControls";

interface Submission {
  id: string;
  business_name: string;
  category: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
}

const STATUSES = ["pending", "approved", "rejected"] as const;

export default function DirectoryAdminPage() {
  const { ready, mosques, selectedMosqueId, setSelectedMosqueId, logout, isPlatformAdmin } = useAdminSession();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>("pending");

  const load = useCallback(async () => {
    if (!selectedMosqueId) return;
    setLoading(true);
    const params = new URLSearchParams({
      mosque_id: selectedMosqueId,
      status: statusFilter,
      page: String(page),
      pageSize: "20",
    });
    const res = await fetch(`/api/admin/business-directory?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSubmissions(data.items);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } else {
      setSubmissions([]);
    }
    setLoading(false);
  }, [selectedMosqueId, page, statusFilter]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const handleDecision = async (id: string, decision: "approved" | "rejected") => {
    await fetch("/api/admin/business-directory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision }),
    });
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
      <h2 className="font-display text-lg mb-3">Business Directory</h2>

      <div className="flex gap-2 mb-4">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
            className={`px-3 py-2 rounded-full text-sm font-medium capitalize ${
              statusFilter === s ? "bg-night-teal text-sand" : "bg-card text-ink/70 border border-sand-dark"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-ink/60 py-8">Loading…</p>
      ) : submissions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Store className="w-8 h-8 text-ink/60" />
          <p className="text-ink/60">No {statusFilter} submissions.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {submissions.map((sub) => (
              <div key={sub.id} className="bg-card rounded-xl p-4">
                <p className="font-medium">{sub.business_name}</p>
                <p className="text-xs text-night-teal">{sub.category.replace(/_/g, " ")}</p>
                {sub.description && <p className="text-sm text-ink/70 mt-1">{sub.description}</p>}
                {sub.address && <p className="text-xs text-ink/60 mt-1">{sub.address}</p>}
                {sub.phone && <p className="text-xs text-ink/60">{sub.phone}</p>}
                {sub.website && <p className="text-xs text-ink/60">{sub.website}</p>}
                {statusFilter === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleDecision(sub.id, "approved")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-night-teal text-sand text-sm font-medium"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleDecision(sub.id, "rejected")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-sand-dark text-ink/70 text-sm font-medium"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
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
