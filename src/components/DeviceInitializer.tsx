"use client";

import { useDeviceInit } from "@/lib/hooks/useDeviceInit";

/** Mounts once on Home Screen load to ensure an authenticated (anonymous)
 * Supabase session exists before the user navigates into Athan/Dua
 * settings or Family Accounts, all of which require auth.uid(). */
export default function DeviceInitializer() {
  useDeviceInit();
  return null;
}
