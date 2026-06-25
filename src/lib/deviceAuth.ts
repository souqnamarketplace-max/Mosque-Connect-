import { cookies } from "next/headers";
import { z } from "zod";

const DEVICE_ID_COOKIE = "mc_device_id";
const uuidSchema = z.string().uuid();

/**
 * Returns the device_id that THIS browser is authorized to read/write,
 * based on an httpOnly cookie set on first visit (see /api/device/init).
 * This is the enforcement boundary for athan_preferences,
 * dua_reminder_preferences, and dua_reminder_log: a request can only
 * touch the row matching the device_id in its own cookie, never one
 * supplied by the client in the request body, which could be spoofed.
 */
export async function getAuthorizedDeviceId(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(DEVICE_ID_COOKIE)?.value;
  if (!raw) return null;
  const parsed = uuidSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function setAuthorizedDeviceId(deviceId: string) {
  const parsed = uuidSchema.safeParse(deviceId);
  if (!parsed.success) throw new Error("Invalid device_id format");
  const cookieStore = await cookies();
  cookieStore.set(DEVICE_ID_COOKIE, parsed.data, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 2, // 2 years
    path: "/",
  });
}

export { DEVICE_ID_COOKIE };
