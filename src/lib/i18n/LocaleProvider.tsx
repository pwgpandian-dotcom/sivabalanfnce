"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { dictionary, translate, type Locale } from "./dictionary";

const STORAGE_KEY = "sivabalan-locale";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: <S extends keyof typeof dictionary>(section: S, key: keyof (typeof dictionary)[S]) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    // One-time sync from localStorage (an external system) after mount; SSR has
    // no access to it, so this can't be a lazy useState initializer. localStorage
    // (not sessionStorage) so the chosen language persists across reloads, tabs,
    // and navigations — e.g. staying in Tamil from loan creation to the receipt.
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "ta") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(stored);
    }
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (section, key) => translate(locale, section, key as never),
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
