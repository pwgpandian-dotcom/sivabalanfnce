"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CustomersIcon } from "../icons";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  activeCount: number;
  closedCount: number;
};

export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [customers, query]);

  return (
    <div className="flex flex-col gap-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("customers", "search")}
        className="w-full max-w-sm rounded-lg border border-gold-soft bg-ivory px-3 py-2 text-sm outline-none focus:border-wine"
      />

      {filtered.length === 0 ? (
        <div className="ledger-card rounded-2xl p-10 text-center text-ink-soft">
          {t("customers", "empty")}
        </div>
      ) : (
        <div className="ledger-card overflow-x-auto rounded-2xl">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gold-soft bg-ivory-deep text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-medium">{t("customers", "name")}</th>
                <th className="px-4 py-3 font-medium">{t("customers", "phone")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("customers", "active")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("customers", "closed")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-gold-soft/60 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${c.id}`}
                      className="flex items-center gap-2 font-medium text-ink hover:text-wine hover:underline"
                    >
                      <CustomersIcon className="h-4 w-4 text-gold" />
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-ink-soft">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-block rounded-full bg-wine/10 px-2 py-0.5 font-mono text-wine">
                      {c.activeCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-block rounded-full bg-gold-soft/40 px-2 py-0.5 font-mono text-ink">
                      {c.closedCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
