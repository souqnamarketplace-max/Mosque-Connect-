import { supportsWebPush } from "@/lib/push/platform";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

export type PushSubscribeResult = "subscribed" | "permission_denied" | "unsupported" | "error";

export async function subscribeToPush(): Promise<PushSubscribeResult> {
  if (!supportsWebPush()) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "permission_denied";

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      }));

    const subJson = subscription.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
    });
    return "subscribed";
  } catch {
    return "error";
  }
}

export async function getPushPermissionState(): Promise<NotificationPermission | "unsupported"> {
  if (!supportsWebPush()) return "unsupported";
  return Notification.permission;
}
