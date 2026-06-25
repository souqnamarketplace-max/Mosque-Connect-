"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface AdminMosque {
  id: string;
  name: string;
  is_active: boolean;
}

const SELECTED_MOSQUE_KEY = "mc_admin_selected_mosque";

/**
 * Shared across every /admin/dashboard/* page: checks auth (redirecting to
 * login if not authenticated), loads the mosques this admin can manage, and
 * persists the selected mosque across navigation between dashboard sections
 * via sessionStorage — so switching from Iqama Times to Announcements
 * doesn't reset back to the first mosque in the list.
 */
export function useAdminSession() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mosques, setMosques] = useState<AdminMosque[]>([]);
  const [selectedMosqueId, setSelectedMosqueIdState] = useState<string | null>(null);
  const [loadingMosques, setLoadingMosques] = useState(true);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.replace("/admin/login");
          return;
        }
        setIsPlatformAdmin(!!data.isPlatformAdmin);
        setCheckingAuth(false);
      });
  }, [router]);

  useEffect(() => {
    if (checkingAuth) return;
    fetch("/api/admin/mosques")
      .then((res) => res.json())
      .then((data) => {
        const list: AdminMosque[] = data.mosques ?? [];
        setMosques(list);
        const stored = typeof window !== "undefined" ? sessionStorage.getItem(SELECTED_MOSQUE_KEY) : null;
        const validStored = stored && list.some((m) => m.id === stored) ? stored : null;
        setSelectedMosqueIdState(validStored ?? list[0]?.id ?? null);
      })
      .finally(() => setLoadingMosques(false));
  }, [checkingAuth]);

  const setSelectedMosqueId = useCallback((id: string) => {
    setSelectedMosqueIdState(id);
    sessionStorage.setItem(SELECTED_MOSQUE_KEY, id);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    sessionStorage.removeItem(SELECTED_MOSQUE_KEY);
    router.push("/admin/login");
  }, [router]);

  return {
    ready: !checkingAuth && !loadingMosques,
    mosques,
    selectedMosqueId,
    setSelectedMosqueId,
    logout,
    isPlatformAdmin,
  };
}
