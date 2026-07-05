"use client";

import { useLocale } from "./LocaleProvider";

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="inline-flex rounded-full border border-gold-soft bg-ivory-deep p-0.5 text-xs font-medium">
      {(["en", "ta"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`rounded-full px-3 py-1 transition-colors ${
            locale === l ? "bg-wine text-onwine" : "text-ink-soft hover:text-ink"
          }`}
        >
          {l === "en" ? "EN" : "தமிழ்"}
        </button>
      ))}
    </div>
  );
}
