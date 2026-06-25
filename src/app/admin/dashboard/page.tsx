import { redirect } from "next/navigation";

// The dashboard root redirects to its first real section. Sub-pages live
// under /admin/dashboard/* (iqama, announcements, events, donations,
// livestream, profile) — see AdminDashboardShell for the tab navigation.
export default function AdminDashboardRootPage() {
  redirect("/admin/dashboard/iqama");
}
