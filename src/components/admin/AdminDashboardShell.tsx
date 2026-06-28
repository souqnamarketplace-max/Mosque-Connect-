"use client";

import { useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Building, ChevronDown, Check } from "lucide-react";
import { AdminMosque } from "@/lib/hooks/useAdminSession";

const TABS = [
  { href: "/admin/dashboard/iqama", label: "Iqama Times" },
  { href: "/admin/dashboard/ramadan", label: "Ramadan" },
  { href: "/admin/dashboard/announcements", label: "Announcements" },
  { href: "/admin/dashboard/events", label: "Events" },
  { href: "/admin/dashboard/classes", label: "Classes" },
  { href: "/admin/dashboard/volunteer", label: "Volunteer" },
  { href: "/admin/dashboard/donations", label: "Donations" },
  { href: "/admin/dashboard/livestream", label: "Live Stream" },
  { href: "/admin/dashboard/directory", label: "Directory" },
  { href: "/admin/dashboard/profile", label: "Mosque Profile" },
  { href: "/admin/dashboard/analytics", label: "Analytics" },
  { href: "/admin/dashboard/audit-logs", label: "Audit Logs" },
];

export default function AdminDashboardShell({
  mosques,
  selectedMosqueId,
  setSelectedMosqueId,
  logout,
  isPlatformAdmin,
  children,
}: {
  mosques: AdminMosque[];
  selectedMosqueId: string | null;
  setSelectedMosqueId: (id: string) => void;
  logout: () => void;
  isPlatformAdmin?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [showPicker, setShowPicker] = useState(false);
  const selectedMosque = mosques.find((m) => m.id === selectedMosqueId);

  const tabs = isPlatformAdmin ? [...TABS, { href: "/admin/dashboard/platform", label: "Platform Admin" }] : TABS;

  return (
    <div className="min-h-screen bg-sand">
      <header className="bg-night-teal text-sand px-5 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="relative">
          <button
            onClick={() => setShowPicker((s) => !s)}
            className="flex items-center gap-2 font-display text-lg"
          >
            <Building className="w-4 h-4 flex-shrink-0" />
            <span className="truncate max-w-44">{selectedMosque?.name ?? "Select Mosque"}</span>
            {mosques.length > 1 && <ChevronDown className="w-4 h-4 flex-shrink-0" />}
          </button>
          {showPicker && mosques.length > 1 && (
            <div className="absolute top-full mt-2 left-0 bg-white text-ink rounded-xl shadow-lg overflow-hidden z-10 min-w-52">
              {mosques.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMosqueId(m.id);
                    setShowPicker(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-sand-dark/30 flex items-center justify-between gap-2"
                >
                  <span className="truncate">{m.name}</span>
                  {m.id === selectedMosqueId && <Check className="w-4 h-4 text-night-teal flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={logout} className="text-sand/60 hover:text-sand" aria-label="Log out">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <nav className="bg-white border-b border-sand-dark overflow-x-auto sticky top-[60px] z-10">
        <div className="flex gap-1 px-3 py-2 min-w-max">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                pathname === tab.href ? "bg-night-teal text-sand" : "text-ink/60 hover:bg-sand-dark/50"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="max-w-md mx-auto px-5 py-6">{children}</main>
    </div>
  );
}
