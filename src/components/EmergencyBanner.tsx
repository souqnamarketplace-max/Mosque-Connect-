"use client";

import { useEffect, useState } from "react";

interface EmergencyNotification {
  id: string;
  title: string;
  message: string;
}

export default function EmergencyBanner({ mosqueId }: { mosqueId: string }) {
  const [notifications, setNotifications] = useState<EmergencyNotification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/emergency-notifications?mosque_id=${mosqueId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, [mosqueId]);

  const visible = notifications.filter((n) => !dismissedIds.has(n.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visible.slice(0, 3).map((n) => (
        <div key={n.id} className="bg-urgent/10 border border-urgent/40 rounded-xl p-3 flex items-start gap-3">
          <div className="flex-1">
            <p className="font-semibold text-urgent text-sm">{n.title}</p>
            <p className="text-sm text-ink/80 mt-0.5">{n.message}</p>
          </div>
          <button
            onClick={() => setDismissedIds((prev) => new Set(prev).add(n.id))}
            aria-label="Dismiss"
            className="text-ink/40 hover:text-ink/70 text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
      {visible.length > 3 && (
        <p className="text-xs text-ink/50">+{visible.length - 3} more</p>
      )}
    </div>
  );
}
