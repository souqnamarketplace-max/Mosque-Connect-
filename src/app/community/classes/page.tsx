"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, GraduationCap, User, MapPin, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface ClassItem {
  id: string;
  title: string;
  description: string | null;
  instructor_name: string | null;
  age_group: string;
  schedule_note: string | null;
  location: string | null;
  capacity: number | null;
  registeredCount: number;
}

export default function ClassesPage() {
  const router = useRouter();
  const { dict } = useI18n();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [form, setForm] = useState({ studentName: "", studentAge: "", contactPhone: "", contactEmail: "" });
  const [result, setResult] = useState<{ classId: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const ageGroupLabels = dict.classes.ageGroups as Record<string, string>;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/classes");
    setClasses(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRegister = async (classId: string) => {
    if (!form.studentName.trim()) {
      setError(dict.classes.studentName);
      return;
    }
    setSaving(true);
    setError(null);
    await fetch("/api/auth/ensure-session", { method: "POST" });
    const res = await fetch("/api/classes/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId,
        studentName: form.studentName,
        studentAge: form.studentAge ? Number(form.studentAge) : undefined,
        contactPhone: form.contactPhone || undefined,
        contactEmail: form.contactEmail || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to register");
      return;
    }
    setResult({
      classId,
      message: data.status === "waitlisted" ? dict.classes.waitlistedSuccess : dict.classes.registeredSuccess,
    });
    setRegisteringId(null);
    setForm({ studentName: "", studentAge: "", contactPhone: "", contactEmail: "" });
    load();
  };

  return (
    <div className="min-h-screen bg-sand pb-24">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button onClick={() => router.back()} aria-label={dict.classes.back} className="text-ink/60 hover:text-ink p-1">
          <ChevronLeft className="w-7 h-7 rtl:rotate-180" />
        </button>
        <h1 className="font-display text-xl">{dict.classes.title}</h1>
      </header>

      <main className="max-w-md mx-auto px-5">
        {loading ? (
          <p className="text-center text-ink/60 py-8">{dict.common.loading}</p>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <GraduationCap className="w-8 h-8 text-ink/60" />
            <p className="text-ink/60">{dict.classes.empty}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => {
              const isFull = cls.capacity != null && cls.registeredCount >= cls.capacity;
              const spotsLeft = cls.capacity != null ? cls.capacity - cls.registeredCount : null;

              return (
                <div key={cls.id} className="bg-white rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h2 className="font-display text-lg">{cls.title}</h2>
                    <span className="text-xs bg-night-teal/10 text-night-teal px-2 py-0.5 rounded-full flex-shrink-0">
                      {ageGroupLabels[cls.age_group]}
                    </span>
                  </div>
                  {cls.description && <p className="text-sm text-ink/70 mb-2">{cls.description}</p>}

                  <div className="space-y-1 text-xs text-ink/60 mb-3">
                    {cls.instructor_name && (
                      <p className="flex items-center gap-1.5">
                        <User className="w-3 h-3" /> {dict.classes.instructor}: {cls.instructor_name}
                      </p>
                    )}
                    {cls.schedule_note && (
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> {cls.schedule_note}
                      </p>
                    )}
                    {cls.location && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" /> {cls.location}
                      </p>
                    )}
                  </div>

                  {spotsLeft != null && (
                    <p className={`text-xs font-medium mb-2 ${isFull ? "text-urgent" : "text-night-teal"}`}>
                      {isFull ? dict.classes.full : `${spotsLeft} ${dict.classes.spotsLeft}`}
                    </p>
                  )}

                  {result?.classId === cls.id ? (
                    <p role="status" className="text-sm text-night-teal bg-night-teal/10 rounded-lg p-2.5">{result.message}</p>
                  ) : registeringId === cls.id ? (
                    <div className="space-y-2 bg-sand-dark/20 rounded-xl p-3">
                      <input
                        type="text"
                        placeholder={dict.classes.studentName}
              aria-label={dict.classes.studentName}
                        value={form.studentName}
                        onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))}
                        className="w-full bg-white rounded-lg px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        placeholder={dict.classes.studentAge}
              aria-label={dict.classes.studentAge}
                        value={form.studentAge}
                        onChange={(e) => setForm((f) => ({ ...f, studentAge: e.target.value }))}
                        className="w-full bg-white rounded-lg px-3 py-2 text-sm"
                      />
                      <input
                        type="tel"
                        placeholder={dict.classes.contactPhone}
              aria-label={dict.classes.contactPhone}
                        value={form.contactPhone}
                        onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                        className="w-full bg-white rounded-lg px-3 py-2 text-sm"
                      />
                      {error && <p className="text-urgent text-xs" role="alert">{error}</p>}
                      <button
                        onClick={() => handleRegister(cls.id)}
                        disabled={saving}
                        className="w-full py-2.5 rounded-full bg-night-teal text-sand text-sm font-medium disabled:opacity-50"
                      >
                        {saving ? dict.classes.registering : dict.classes.confirmRegister}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRegisteringId(cls.id)}
                      className="w-full py-2.5 rounded-full bg-night-teal text-sand text-sm font-medium"
                    >
                      {dict.classes.register}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
