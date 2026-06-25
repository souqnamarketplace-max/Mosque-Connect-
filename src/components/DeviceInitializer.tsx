"use client";

import { useDeviceInit } from "@/lib/hooks/useDeviceInit";

/** Mounts once on Home Screen load to ensure the device_id cookie exists
 * before the user navigates into Athan/Dua settings, which require it. */
export default function DeviceInitializer() {
  useDeviceInit();
  return null;
}
