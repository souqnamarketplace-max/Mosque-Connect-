"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Users, Plus, Crown, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface FamilyMember {
  id: string;
  user_id: string;
  display_name: string;
  relationship: string | null;
  is_account_owner: boolean;
}

export default function FamilyAccountPage() {
  const router = useRouter();
  const { dict } = useI18n();
  const [family, setFamily] = useState<{ id: string; name: string | null } | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ displayName: "", name: "" });
  const [error, setError] = useState<string | null>(null);

  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [invitingLoading, setInvitingLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/family");
    const data = await res.json();
    setFamily(data.family);
    setMembers(data.members);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/ensure-session", { method: "POST" })
      .then((res) => res.json())
      .then((data) => setCurrentUserId(data.userId ?? null));
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!createForm.displayName.trim()) {
      setError("Your name is required");
      return;
    }
    setCreating(true);
    setError(null);
    const res = await fetch("/api/family", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: createForm.displayName, name: createForm.name || undefined }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create family");
      return;
    }
    load();
  };

  const handleInvite = async () => {
    setInvitingLoading(true);
    const res = await fetch("/api/family/invite", { method: "POST" });
    const data = await res.json();
    setInvitingLoading(false);
    if (res.ok) {
      setInviteUrl(`${window.location.origin}${data.acceptUrl}`);
    }
  };

  const handleRemove = async (memberId: string, isSelf: boolean) => {
    const confirmed = confirm(isSelf ? dict.family.confirmLeave : dict.family.confirmRemove);
    if (!confirmed) return;
    await fetch("/api/family", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (isSelf) {
      setFamily(null);
      setMembers([]);
    } else {
      load();
    }
  };

  const isOwner = members.find((m) => m.user_id === currentUserId)?.is_account_owner ?? false;

  if (loading) {
    return <div className="min-h-screen bg-sand p-6 text-center text-ink/50 text-lg">{dict.common.loading}</div>;
  }

  return (
    <div className="min-h-screen bg-sand pb-24">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button onClick={() => router.back()} aria-label={dict.family.back} className="text-ink/60 hover:text-ink p-1">
          <ChevronLeft className="w-7 h-7 rtl:rotate-180" />
        </button>
        <h1 className="font-display text-xl">{dict.family.title}</h1>
      </header>

      <main className="max-w-md mx-auto px-5">
        {!family ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <Users className="w-10 h-10 text-ink/30" />
            <p className="text-ink/60">{dict.family.noFamilyYet}</p>
            <div className="w-full bg-white rounded-2xl p-4 space-y-3 text-left">
              <input
                type="text"
                placeholder={dict.family.yourName}
                value={createForm.displayName}
                onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
                className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
              />
              <input
                type="text"
                placeholder={dict.family.familyNameOptional}
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
              />
              {error && <p className="text-urgent text-sm">{error}</p>}
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full py-3 rounded-full bg-night-teal text-sand font-medium disabled:opacity-50"
              >
                {creating ? "Creating…" : dict.family.createFamily}
              </button>
            </div>
          </div>
        ) : (
          <>
            {family.name && <h2 className="font-display text-xl mb-4 text-center">{family.name}</h2>}

            <h3 className="text-sm font-medium text-ink/60 mb-2">{dict.family.members}</h3>
            <div className="bg-white rounded-2xl divide-y divide-sand-dark mb-5">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{member.display_name}</span>
                      {member.is_account_owner && <Crown className="w-3.5 h-3.5 text-gold" />}
                    </div>
                    {member.relationship && <p className="text-xs text-ink/50">{member.relationship}</p>}
                  </div>
                  {(isOwner || member.user_id === currentUserId) && (
                    <button
                      onClick={() => handleRemove(member.id, member.user_id === currentUserId)}
                      className="text-ink/30 hover:text-urgent p-1"
                      aria-label={dict.family.removeMember}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isOwner && (
              <div className="bg-white rounded-2xl p-4">
                {inviteUrl ? (
                  <>
                    <p className="text-sm font-medium mb-2">{dict.family.inviteLinkCreated}</p>
                    <p className="text-xs break-all bg-sand-dark/30 rounded-lg p-2 mb-2">{inviteUrl}</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(inviteUrl)}
                      className="text-sm text-night-teal underline"
                    >
                      {dict.family.copyLink}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleInvite}
                    disabled={invitingLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-night-teal text-sand font-medium disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    {invitingLoading ? "Creating…" : dict.family.inviteMember}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
