"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Bell, CalendarDays, Megaphone, HandCoins, Search, Store } from "lucide-react";
import { useAdminSession } from "@/lib/hooks/useAdminSession";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";

interface Analytics {
  followers: number;
  pushSubscribers: number;
  notifications: { sent: number; failed: number; skippedQuietHours: number; skippedOptedOut: number };
  upcomingEvents: number;
  announcementsLast30Days: number;
  classes: { registered: number; waitlisted: number };
  volunteer: { confirmed: number; waitlisted: number };
  donations: { totalLast30Days: number; currency: string };
  lostFound: { open: number; resolved: number };
  businessDirectoryPending: number;
}

export default function AnalyticsAdminPage() {
  const { ready, mosques, selectedMosqueId, setSelectedMosqueId, logout, isPlatformAdmin } = useAdminSession();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedMosqueId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/analytics?mosque_id=${selectedMosqueId}`);
    setData(res.ok ? await res.json() : null);
    setLoading(false);
  }, [selectedMosqueId]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

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
      <h2 className="font-display text-lg mb-1">Analytics</h2>
      <p className="text-xs text-ink/60 mb-4">Last 30 days, unless noted otherwise</p>

      {loading || !data ? (
        <p className="text-center text-ink/60 py-8">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users} label="Followers" value={data.followers} />
            <StatCard icon={Bell} label="Push Enabled" value={data.pushSubscribers} />
          </div>

          <Section title="Notification Delivery">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Row label="Sent" value={data.notifications.sent} color="text-night-teal" />
              <Row label="Failed" value={data.notifications.failed} color="text-urgent" />
              <Row label="Skipped (quiet hours)" value={data.notifications.skippedQuietHours} color="text-gold" />
              <Row label="Skipped (opted out)" value={data.notifications.skippedOptedOut} color="text-ink/60" />
            </div>
          </Section>

          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={CalendarDays} label="Upcoming Events" value={data.upcomingEvents} />
            <StatCard icon={Megaphone} label="Announcements (30d)" value={data.announcementsLast30Days} />
          </div>

          <Section title="Islamic Classes">
            <Row label="Registered" value={data.classes.registered} color="text-night-teal" />
            <Row label="Waitlisted" value={data.classes.waitlisted} color="text-gold" />
          </Section>

          <Section title="Volunteer Sign-ups">
            <Row label="Confirmed" value={data.volunteer.confirmed} color="text-night-teal" />
            <Row label="Waitlisted" value={data.volunteer.waitlisted} color="text-gold" />
          </Section>

          <div className="bg-night-teal text-sand rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <HandCoins className="w-4 h-4" />
              <p className="text-sm text-sand/70">Donations (30 days)</p>
            </div>
            <p className="font-display text-2xl">
              {data.donations.currency} {data.donations.totalLast30Days.toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Search} label="Lost & Found Open" value={data.lostFound.open} />
            <StatCard icon={Store} label="Directory Pending" value={data.businessDirectoryPending} />
          </div>
        </div>
      )}
    </AdminDashboardShell>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl p-4">
      <Icon className="w-4 h-4 text-night-teal mb-2" />
      <p className="font-display text-2xl">{value.toLocaleString()}</p>
      <p className="text-xs text-ink/60">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4">
      <p className="text-sm font-medium mb-2">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-ink/60">{label}</span>
      <span className={`font-medium ${color}`}>{value.toLocaleString()}</span>
    </div>
  );
}
