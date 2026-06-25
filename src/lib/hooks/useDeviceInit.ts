"use client";

import { useEffect, useState } from "react";

/** Ensures an authenticated (anonymous) Supabase session exists before any
 * preference reads/writes that depend on auth.uid(). Despite the filename
 * (kept for now to avoid churning every import), this no longer manages a
 * device_id cookie — it triggers Supabase Anonymous Auth via the server
 * route, which sets a real session cookie. */
export function useDeviceInit() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/auth/ensure-session", { method: "POST" })
      .then(() => setReady(true))
      .catch(() => setReady(true)); // fail open for read-only public content
  }, []);

  return ready;
}
