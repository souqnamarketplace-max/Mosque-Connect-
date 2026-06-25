import { redirect } from "next/navigation";

// Settings now lives at /profile (footer nav destination). This redirect
// keeps any existing links to /settings working rather than 404ing.
export default function SettingsRedirectPage() {
  redirect("/profile");
}
