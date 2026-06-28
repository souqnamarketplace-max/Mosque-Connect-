"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, HandHeart, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Shift {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  capacity: number | null;
  signedUpCount: number;
}

interface Opportunity {
  id: string;
  title: string;
  description: string | null;
  category: string;
  coordinator_name: string | null;
  shifts: Shift[];
}

export default function VolunteerPage() {
  const router = useRouter();
  const { dict, language } = useI18n();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingUpShiftId, setSigningUpShiftId] = useState<string | null>(null);
  const [form, setForm] = useState({ volunteerName: "", contactPhone: "", contactEmail: "", notes: "" });
  const [result, setResult] = useState<{ shiftId: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categoryLabels = dict.volunteer.categories as Record<string, string>;
  const locale = language === "ar" ? "ar" : language === "ur" ? "ur" : "en-US";

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/volunteer");
    setOpportunities(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSignUp = async (shiftId: string) => {
    if (!form.volunteerName.trim()) {
      setError(dict.volunteer.yourName);
      return;
    }
    setSaving(true);
    setError(null);
    await fetch("/api/auth/ensure-session", { method: "POST" });
    const res = await fetch("/api/volunteer/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId, ...form }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to sign up");
      return;
    }
    setResult({
      shiftId,
      message: data.status === "waitlisted" ? dict.volunteer.waitlistedSuccess : dict.volunteer.signedUpSuccess,
    });
    setSigningUpShiftId(null);
    setForm({ volunteerName: "", contactPhone: "", contactEmail: "", notes: "" });
    load();
  };

  return (
    <div className="min-h-screen bg-sand pb-24">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button onClick={() => router.back()} aria-label={dict.volunteer.back} className="text-ink/60 hover:text-ink p-1">
          <ChevronLeft className="w-7 h-7 rtl:rotate-180" />
        </button>
        <h1 className="font-display text-xl">{dict.volunteer.title}</h1>
      </header>

      <main className="max-w-md mx-auto px-5">
        {loading ? (
          <p className="text-center text-ink/60 py-8">{dict.common.loading}</p>
        ) : opportunities.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <HandHeart className="w-8 h-8 text-ink/60" />
            <p className="text-ink/60">{dict.volunteer.empty}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opp) => (
              <div key={opp.id} className="bg-card rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h2 className="font-display text-lg">{opp.title}</h2>
                  <span className="text-xs bg-night-teal/10 text-night-teal px-2 py-0.5 rounded-full flex-shrink-0">
                    {categoryLabels[opp.category]}
                  </span>
                </div>
                {opp.description && <p className="text-sm text-ink/70 mb-2">{opp.description}</p>}
                {opp.coordinator_name && (
                  <p className="text-xs text-ink/60 mb-3">
                    {dict.volunteer.coordinator}: {opp.coordinator_name}
                  </p>
                )}

                {opp.shifts.length === 0 ? (
                  <p className="text-xs text-ink/60">No upcoming shifts scheduled.</p>
                ) : (
                  <div className="space-y-2">
                    {opp.shifts.map((shift) => {
                      const isFull = shift.capacity != null && shift.signedUpCount >= shift.capacity;
                      const spotsLeft = shift.capacity != null ? shift.capacity - shift.signedUpCount : null;

                      return (
                        <div key={shift.id} className="bg-sand-dark/20 rounded-xl p-3">
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(shift.shift_date + "T12:00:00Z").toLocaleDateString(locale, {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            · {shift.start_time.substring(0, 5)}–{shift.end_time.substring(0, 5)}
                          </p>
                          {spotsLeft != null && (
                            <p className={`text-xs mt-1 ${isFull ? "text-urgent" : "text-night-teal"}`}>
                              {isFull ? dict.volunteer.full : `${spotsLeft} ${dict.volunteer.spotsLeft}`}
                            </p>
                          )}

                          {result?.shiftId === shift.id ? (
                            <p role="status" className="text-sm text-night-teal mt-2">{result.message}</p>
                          ) : signingUpShiftId === shift.id ? (
                            <div className="space-y-2 mt-2">
                              <input
                                type="text"
                                placeholder={dict.volunteer.yourName}
              aria-label={dict.volunteer.yourName}
                                value={form.volunteerName}
                                onChange={(e) => setForm((f) => ({ ...f, volunteerName: e.target.value }))}
                                className="w-full bg-card rounded-lg px-3 py-2 text-sm"
                              />
                              <input
                                type="tel"
                                placeholder={dict.volunteer.contactPhone}
              aria-label={dict.volunteer.contactPhone}
                                value={form.contactPhone}
                                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                                className="w-full bg-card rounded-lg px-3 py-2 text-sm"
                              />
                              {error && <p className="text-urgent text-xs" role="alert">{error}</p>}
                              <button
                                onClick={() => handleSignUp(shift.id)}
                                disabled={saving}
                                className="w-full py-2 rounded-full bg-night-teal text-sand text-sm font-medium disabled:opacity-50"
                              >
                                {saving ? dict.volunteer.signingUp : dict.volunteer.confirmSignUp}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setSigningUpShiftId(shift.id)}
                              className="w-full py-2 rounded-full bg-night-teal text-sand text-sm font-medium mt-2"
                            >
                              {dict.volunteer.signUp}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
