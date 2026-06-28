"use client";

import { useState } from "react";

interface TranslatableField {
  en: string;
  ar: string;
  ur: string;
}

interface Props {
  label: string;
  values: TranslatableField;
  onChange: (values: TranslatableField) => void;
  multiline?: boolean;
  required?: boolean;
  placeholder?: string;
}

/**
 * A single field that admins fill in for all 3 languages, with a tab
 * switcher rather than 3 stacked inputs — keeps the form compact while
 * making it unmissable that translations are expected, not buried as an
 * optional afterthought. English is required (it's always the fallback
 * language at the API layer per resolveLocalizedFields); Arabic/Urdu are
 * optional, with an unfilled-tab indicator so admins can see at a glance
 * which languages still need translating.
 */
export default function TranslatableInput({ label, values, onChange, multiline, required, placeholder }: Props) {
  const [activeTab, setActiveTab] = useState<"en" | "ar" | "ur">("en");

  const tabs: Array<{ code: "en" | "ar" | "ur"; label: string }> = [
    { code: "en", label: "EN" },
    { code: "ar", label: "AR" },
    { code: "ur", label: "UR" },
  ];

  const InputTag = multiline ? "textarea" : "input";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-ink-secondary">
          {label} {required && activeTab === "en" && <span className="text-urgent">*</span>}
        </label>
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const isFilled = values[tab.code].trim().length > 0;
            return (
              <button
                key={tab.code}
                type="button"
                onClick={() => setActiveTab(tab.code)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTab === tab.code
                    ? "bg-night-teal text-white"
                    : isFilled
                    ? "bg-success/15 text-success"
                    : "bg-sand-dark text-ink-secondary"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <InputTag
        dir={activeTab === "ar" ? "rtl" : activeTab === "ur" ? "rtl" : "ltr"}
        value={values[activeTab]}
        onChange={(e) => onChange({ ...values, [activeTab]: e.target.value })}
        placeholder={activeTab === "en" ? placeholder : `${placeholder ?? ""} (${activeTab.toUpperCase()})`}
        rows={multiline ? 3 : undefined}
        className="w-full bg-sand-dark/30 rounded-lg px-3 py-2.5"
      />
    </div>
  );
}

export type { TranslatableField };
