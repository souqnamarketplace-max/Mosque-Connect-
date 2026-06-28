"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, HandCoins } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Campaign {
  id: string;
  category: string;
  title: string;
  description: string | null;
  image_url: string | null;
  goal_amount: number | null;
  raised_amount: number;
  currency: string;
}

const PRESET_AMOUNTS = [20, 50, 100, 250];

export default function DonatePage() {
  const router = useRouter();
  const { dict } = useI18n();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [frequency, setFrequency] = useState<"one_time" | "monthly">("one_time");

  useEffect(() => {
    fetch("/api/donation-campaigns")
      .then((res) => res.json())
      .then((data) => {
        setCampaigns(data);
        if (data.length > 0) setSelectedCampaignId(data[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);
  const finalAmount = customAmount ? parseFloat(customAmount) : amount;

  if (loading) {
    return <div className="min-h-screen bg-sand p-6 text-center text-ink/60 text-lg">{dict.common.loading}</div>;
  }

  return (
    <div className="min-h-screen bg-sand">
      <header className="flex items-center gap-3 px-5 pt-6 pb-4 max-w-md mx-auto">
        <button onClick={() => router.back()} aria-label={dict.donate.back} className="text-ink/60 hover:text-ink p-1">
          <ChevronLeft className="w-7 h-7 rtl:rotate-180" />
        </button>
        <h1 className="font-display text-xl">{dict.donate.title}</h1>
      </header>

      <main className="max-w-md mx-auto px-5 pb-16">
        {campaigns.length === 0 ? (
          <p className="text-center text-ink/60 text-lg py-12">{dict.donate.noActiveCampaigns}</p>
        ) : (
          <>
            {campaigns.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {campaigns.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCampaignId(c.id)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                      selectedCampaignId === c.id ? "bg-night-teal text-sand" : "bg-card text-ink/70"
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            )}

            {selectedCampaign && (
              <div className="bg-night-teal text-sand rounded-2xl p-5 mb-5">
                <h2 className="font-display text-xl mb-2">{selectedCampaign.title}</h2>
                {selectedCampaign.description && (
                  <p className="text-sand/80 text-sm mb-4">{selectedCampaign.description}</p>
                )}
                <div className="flex justify-between text-sm mb-1.5">
                  <span>
                    {dict.donate.raised}: {selectedCampaign.currency} {selectedCampaign.raised_amount.toLocaleString()}
                  </span>
                  {selectedCampaign.goal_amount && (
                    <span className="text-sand/60">
                      {dict.donate.ofGoal} {selectedCampaign.currency} {selectedCampaign.goal_amount.toLocaleString()}
                    </span>
                  )}
                </div>
                {selectedCampaign.goal_amount && (
                  <div className="h-2.5 rounded-full bg-sand/20 overflow-hidden">
                    <div
                      className="h-full bg-gold rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (selectedCampaign.raised_amount / selectedCampaign.goal_amount) * 100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Frequency */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              {(["one_time", "monthly"] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => setFrequency(freq)}
                  className={`py-3.5 rounded-xl text-base font-medium transition-colors ${
                    frequency === freq ? "bg-night-teal text-sand" : "bg-card text-ink/70"
                  }`}
                >
                  {freq === "one_time" ? dict.donate.oneTime : dict.donate.monthly}
                </button>
              ))}
            </div>

            {/* Amount selection */}
            <h3 className="text-base font-medium text-ink/60 mb-2">{dict.donate.selectAmount}</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setAmount(preset);
                    setCustomAmount("");
                  }}
                  className={`py-5 rounded-2xl text-xl font-display transition-colors ${
                    amount === preset && !customAmount
                      ? "bg-gold text-ink"
                      : "bg-card text-ink border border-sand-dark"
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
            <input
              type="number"
              inputMode="decimal"
              placeholder={dict.donate.customAmount}
              aria-label={dict.donate.customAmount}
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setAmount(null);
              }}
              className="w-full bg-card rounded-xl px-4 py-4 text-lg border border-sand-dark mb-6"
            />

            {/* Honest placeholder — payment integration not yet wired up. */}
            <div className="bg-sand-dark/40 rounded-2xl p-4 text-center text-ink/70 text-sm mb-4">
              {dict.donate.comingSoon}
            </div>

            <button
              disabled
              className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-night-teal/40 text-sand font-medium text-lg cursor-not-allowed"
            >
              <HandCoins className="w-5 h-5" />
              {finalAmount ? `${dict.donate.donateNow} — $${finalAmount}` : dict.donate.donateNow}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
