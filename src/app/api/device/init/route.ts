import { NextResponse } from "next/server";
import { getAuthorizedDeviceId, setAuthorizedDeviceId } from "@/lib/deviceAuth";
import { randomUUID } from "crypto";

// Called once on first app load (client checks for the cookie first;
// this route only fires if none exists yet). Issues a fresh device_id
// and sets it as an httpOnly cookie, which becomes the enforcement
// boundary for all device-scoped preference reads/writes.
export async function POST() {
  const existing = await getAuthorizedDeviceId();
  if (existing) {
    return NextResponse.json({ deviceId: existing, created: false });
  }
  const deviceId = randomUUID();
  await setAuthorizedDeviceId(deviceId);
  return NextResponse.json({ deviceId, created: true });
}
