"use client";

import { useEffect, useState, useCallback } from "react";
import { Radio, Square } from "lucide-react";
import { useAdminSession } from "@/lib/hooks/useAdminSession";
import AdminDashboardShell from "@/components/admin/AdminDashboardShell";

interface Stream {
  id: string;
  title: string | null;
  source: string;
  stream_url: string;
  is_live: boolean;
  recording_url: string | null;
  started_at: string | null;
}

export default function LiveStreamAdminPage() {
  const { ready, mosques, selectedMosqueId, setSelectedMosqueId, logout, isPlatformAdmin } = useAdminSession();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [recordingUrlInput, setRecordingUrlInput] = useState("");

  const [form, setForm] = useState({ title: "", source: "youtube" as "youtube" | "facebook" | "custom", streamUrl: "" });

  const load = useCallback(async () => {
    if (!selectedMosqueId) return;
    setLoading(true);
    const res = await fetch(`/api/admin/live-streams?mosque_id=${selectedMosqueId}`);
    setStreams(res.ok ? await res.json() : []);
    setLoading(false);
  }, [selectedMosqueId]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const liveStream = streams.find((s) => s.is_live);

  const handleGoLive = async () => {
    if (!selectedMosqueId || !form.streamUrl.trim()) {
      setError("Stream URL is required");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/live-streams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mosqueId: selectedMosqueId, ...form }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to go live");
      return;
    }
    setForm({ title: "", source: "youtube", streamUrl: "" });
    load();
  };

  const handleEndStream = async () => {
    if (!liveStream) return;
    setSaving(true);
    await fetch("/api/admin/live-streams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: liveStream.id, recordingUrl: recordingUrlInput || undefined }),
    });
    setSaving(false);
    setRecordingUrlInput("");
    load();
  };

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-ink/50">Checking access…</div>;
  }

  return (
    <AdminDashboardShell
      isPlatformAdmin={isPlatformAdmin}
      mosques={mosques}
      selectedMosqueId={selectedMosqueId}
      setSelectedMosqueId={setSelectedMosqueId}
      logout={logout}
    >
      <h2 className="font-display text-lg mb-4">Live Stream</h2>

      {loading ? (
        <p className="text-center text-ink/50 py-8">Loading…</p>
      ) : liveStream ? (
        <div className="bg-night-teal text-sand rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center gap-1.5 bg-urgent text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
            <span className="text-sm">{liveStream.title || liveStream.source}</span>
          </div>
          <p className="text-sand/70 text-sm break-all mb-4">{liveStream.stream_url}</p>

          <input
            type="url"
            placeholder="Recording URL to save (optional)"
            value={recordingUrlInput}
            onChange={(e) => setRecordingUrlInput(e.target.value)}
            className="w-full bg-sand/10 rounded-lg px-3 py-2.5 text-sand placeholder:text-sand/40 mb-3"
          />

          <button
            onClick={handleEndStream}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-urgent text-white font-medium disabled:opacity-50"
          >
            <Square className="w-4 h-4" />
            {saving ? "Ending…" : "End Stream"}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <p className="text-sm text-ink/60 mb-1">Start a new live stream:</p>
          <input
            type="text"
            placeholder="Title (optional, e.g. Friday Khutbah)"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          <select
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as typeof form.source }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          >
            <option value="youtube">YouTube</option>
            <option value="facebook">Facebook</option>
            <option value="custom">Custom URL</option>
          </select>
          <input
            type="url"
            placeholder="Stream URL"
            value={form.streamUrl}
            onChange={(e) => setForm((f) => ({ ...f, streamUrl: e.target.value }))}
            className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
          />
          {error && <p className="text-urgent text-sm">{error}</p>}
          <button
            onClick={handleGoLive}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-night-teal text-sand font-medium disabled:opacity-50"
          >
            <Radio className="w-4 h-4" />
            {saving ? "Starting…" : "Go Live"}
          </button>
        </div>
      )}
    </AdminDashboardShell>
  );
}
