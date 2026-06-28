"use client";

import { useEffect, useState, useCallback } from "react";
import { ScrollText, Filter, X } from "lucide-react";
import { useAdminSession } from "@/lib/hooks/useAdminSession";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import PaginationControls from "@/components/admin/PaginationControls";

interface AuditLog {
  id: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  "announcement.create": "Posted announcement",
  "announcement.delete": "Deleted announcement",
  "event.create": "Created event",
  "event.delete": "Deleted event",
  "donation_campaign.create": "Created donation campaign",
  "donation_campaign.toggle_active": "Toggled donation campaign",
  "iqama_times.upsert": "Updated Iqama times",
  "live_stream.start": "Started live stream",
  "live_stream.end": "Ended live stream",
  "mosque_profile.update": "Updated mosque profile",
  "mosque_admin_invite.create": "Invited mosque admin",
  "islamic_class.create": "Created class",
  "islamic_class.deactivate": "Removed class",
  "volunteer_opportunity.create": "Created volunteer opportunity",
  "volunteer_opportunity.deactivate": "Removed volunteer opportunity",
  "business_directory.approved": "Approved business listing",
  "business_directory.rejected": "Rejected business listing",
};

export default function AuditLogsAdminPage() {
  const { ready, mosques, selectedMosqueId, setSelectedMosqueId, logout, isPlatformAdmin } = useAdminSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    if (!selectedMosqueId) return;
    setLoading(true);
    const params = new URLSearchParams({ mosque_id: selectedMosqueId, page: String(page), pageSize: "25" });
    if (actionFilter) params.set("action", actionFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    const res = await fetch(`/api/admin/audit-logs?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.items);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } else {
      setLogs([]);
    }
    setLoading(false);
  }, [selectedMosqueId, page, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setActionFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasActiveFilters = actionFilter || dateFrom || dateTo;

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
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg">Audit Logs</h2>
        <button
          onClick={() => setShowFilters((s) => !s)}
          aria-label={showFilters ? "Hide filters" : "Show filters"}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium ${
            hasActiveFilters ? "bg-night-teal text-sand" : "bg-card text-ink/70 border border-sand-dark"
          }`}
        >
          {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
          Filter{hasActiveFilters ? "ing" : ""}
        </button>
      </div>

      {showFilters && (
        <div className="bg-card rounded-2xl p-4 mb-4 space-y-3">
          <select
            value={actionFilter}
            onChange={(e) => handleFilterChange(setActionFilter)(e.target.value)}
            aria-label="Filter by action type"
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5 text-sm"
          >
            <option value="">All actions</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleFilterChange(setDateFrom)(e.target.value)}
              aria-label="From date"
              className="bg-sand-dark/30 rounded-lg px-3 py-2.5 text-sm"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleFilterChange(setDateTo)(e.target.value)}
              aria-label="To date"
              className="bg-sand-dark/30 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm text-night-teal underline">
              Clear filters
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-center text-ink/60 py-8">Loading…</p>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <ScrollText className="w-8 h-8 text-ink/40" />
          <p className="text-ink/60">{hasActiveFilters ? "No actions match these filters." : "No admin actions logged yet."}</p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {logs.map((log) => (
              <div key={log.id} className="bg-card rounded-xl p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{ACTION_LABELS[log.action] ?? log.action}</span>
                  <span className="text-xs text-ink/60">
                    {new Date(log.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-xs text-ink/60 mt-0.5">{log.actor_email}</p>
                {log.details && Object.keys(log.details).length > 0 && (
                  <p className="text-xs text-ink/60 mt-1">
                    {Object.entries(log.details)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")}
                  </p>
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
