"use client";

import { useEffect, useState, useCallback } from "react";
import { ScrollText } from "lucide-react";
import { useAdminSession } from "@/lib/hooks/useAdminSession";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";

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
};

export default function AuditLogsAdminPage() {
  const { ready, mosques, selectedMosqueId, setSelectedMosqueId, logout, isPlatformAdmin } = useAdminSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedMosqueId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/audit-logs?mosque_id=${selectedMosqueId}`);
    setLogs(res.ok ? await res.json() : []);
    setLoading(false);
  }, [selectedMosqueId]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-ink/50">Checking access…</div>;
  }

  return (
    <AdminDashboardShell
      mosques={mosques}
      selectedMosqueId={selectedMosqueId}
      setSelectedMosqueId={setSelectedMosqueId}
      logout={logout}
      isPlatformAdmin={isPlatformAdmin}
    >
      <h2 className="font-display text-lg mb-4">Audit Logs</h2>

      {loading ? (
        <p className="text-center text-ink/50 py-8">Loading…</p>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <ScrollText className="w-8 h-8 text-ink/30" />
          <p className="text-ink/50">No admin actions logged yet.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {logs.map((log) => (
            <div key={log.id} className="bg-white rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{ACTION_LABELS[log.action] ?? log.action}</span>
                <span className="text-xs text-ink/40">
                  {new Date(log.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-xs text-ink/50 mt-0.5">{log.actor_email}</p>
              {log.details && Object.keys(log.details).length > 0 && (
                <p className="text-xs text-ink/40 mt-1">
                  {Object.entries(log.details)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminDashboardShell>
  );
}
