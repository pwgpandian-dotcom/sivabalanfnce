"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LocaleToggle } from "@/lib/i18n/LocaleToggle";
import { signIn } from "./actions";

export function LoginForm({ errorMessage }: { errorMessage?: string }) {
  const { t } = useLocale();

  return (
    <div className="flex w-full items-center justify-center">
      <div className="ledger-card w-full max-w-sm rounded-2xl p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-serif text-2xl font-semibold text-wine">{t("login", "heading")}</h1>
          <LocaleToggle />
        </div>

        <form action={signIn} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("login", "email")}
            <input
              name="email"
              type="email"
              required
              className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 text-ink outline-none focus:border-wine"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("login", "password")}
            <input
              name="password"
              type="password"
              required
              className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 text-ink outline-none focus:border-wine"
            />
          </label>

          {errorMessage && <p className="text-sm text-wine-soft">{errorMessage}</p>}

          <button
            type="submit"
            className="mt-2 rounded-lg bg-wine px-4 py-2 font-medium text-onwine transition-colors hover:bg-wine-deep"
          >
            {t("login", "submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
