"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "sivabalan-theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Applies the `.dark` class to <html> and persists the choice to localStorage.
 * The matching CSS lives in globals.css (see the `.dark` overrides). A tiny
 * inline script in the root layout applies the stored theme before first paint
 * to avoid a flash, so this provider only needs to keep React state in sync.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeState(stored);
    } else if (document.documentElement.classList.contains("dark")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeState("dark");
    }
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
