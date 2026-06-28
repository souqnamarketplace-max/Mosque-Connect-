"use client";

/**
 * Offline Prayer Schedules: caches the most recently fetched prayer-times
 * payload (and a short rolling window if available) in IndexedDB, so the
 * Prayer Countdown Widget can still render something useful — today's
 * Adhan/Iqama times — when the device has no connectivity. This is a
 * read-through cache: every successful network fetch updates it; every
 * failed fetch falls back to reading from it.
 */

const DB_NAME = "masjid-connect-offline";
const DB_VERSION = 1;
const STORE_NAME = "prayer-cache";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface CachedPrayerEntry {
  key: string; // `${mosqueId}:${date}`
  payload: unknown;
  cachedAt: string;
}

export async function cachePrayerPayload(mosqueId: string, date: string, payload: unknown): Promise<void> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({
      key: `${mosqueId}:${date}`,
      payload,
      cachedAt: new Date().toISOString(),
    } satisfies CachedPrayerEntry);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to cache prayer payload for offline use:", err);
  }
}

export async function getCachedPrayerPayload(
  mosqueId: string,
  date: string
): Promise<{ payload: unknown; cachedAt: string } | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return null;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(`${mosqueId}:${date}`);
    const result = await new Promise<CachedPrayerEntry | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return result ? { payload: result.payload, cachedAt: result.cachedAt } : null;
  } catch (err) {
    console.warn("Failed to read cached prayer payload:", err);
    return null;
  }
}

/** Returns the most recent cache entry for this mosque, regardless of date —
 * used as a last-resort fallback if even "today" was never successfully
 * cached (e.g. first-ever offline launch), so the widget can still show
 * *something* rather than nothing, clearly labeled as stale. */
export async function getMostRecentCachedPayload(
  mosqueId: string
): Promise<{ payload: unknown; cachedAt: string; date: string } | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return null;
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    const allEntries = await new Promise<CachedPrayerEntry[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as CachedPrayerEntry[]);
      request.onerror = () => reject(request.error);
    });
    const forMosque = allEntries
      .filter((e) => e.key.startsWith(`${mosqueId}:`))
      .sort((a, b) => new Date(b.cachedAt).getTime() - new Date(a.cachedAt).getTime());
    if (forMosque.length === 0) return null;
    const [, date] = forMosque[0].key.split(":");
    return { payload: forMosque[0].payload, cachedAt: forMosque[0].cachedAt, date };
  } catch (err) {
    console.warn("Failed to read most recent cached payload:", err);
    return null;
  }
}
