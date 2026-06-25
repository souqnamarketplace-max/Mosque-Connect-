"use client";

import { useEffect, useState } from "react";

/** Ensures /api/device/init has been called once per browser so the
 * httpOnly device_id cookie exists before any preference reads/writes. */
export function useDeviceInit() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/device/init", { method: "POST" })
      .then(() => setReady(true))
      .catch(() => setReady(true)); // fail open for read-only public content
  }, []);

  return ready;
}
