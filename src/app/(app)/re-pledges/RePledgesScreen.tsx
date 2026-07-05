"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise } from "@/lib/money";
import type { RePledgeRow, CandidateRow } from "@/lib/rePledges";

export function RePledgesScreen({
  rePledges,
  candidates,
}: {
  rePledges: RePledgeRow[];
  candidates: CandidateRow[];
}) {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [tab, setTab] = useState<"all" | "candidates">("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "redeemed">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rePledges.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      return (
        r.broker.toLowerCase().includes(q) ||
        r.loanNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q)
      );
    });
  }, [rePledges, search, status]);

  async function markRedeemed(id: string) {
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("re_pledges").update({ status: "redeemed", redeemed_date: today }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gold-soft">
        <TabButton active={tab === "all"} onClick={() => setTab("all")} label={`${t("rePledgeScreen", "allTab")} (${rePledges.length})`} />
        <TabButton active={tab === "candidates"} onClick={() => setTab("candidates")} label={`${t("rePledgeScreen", "candidatesTab")} (${candidates.length})`} />
      </div>

      {tab === "all" ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("rePledgeScreen", "searchBroker")}
              className="w-full max-w-xs rounded-lg border border-gold-soft bg-ivory px-3 py-2 text-sm outline-none focus:border-wine"
            />
            <div className="inline-flex rounded-full border border-gold-soft bg-ivory-deep p-0.5 text-xs font-medium">
              {(["all", "active", "redeemed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-full px-3 py-1 transition-colors ${
                    status === s ? "bg-wine text-onwine" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {t("rePledgeScreen", s === "all" ? "filterAll" : s === "active" ? "filterActive" : "filterRedeemed")}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="ledger-card rounded-2xl p-10 text-center text-ink-soft">{t("rePledgeScreen", "empty")}</div>
          ) : (
            <div className="ledger-card overflow-x-auto rounded-2xl">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gold-soft bg-ivory-deep text-left text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-3 py-3 font-medium">{t("rePledgeScreen", "loan")}</th>
                    <th className="px-3 py-3 font-medium">{t("rePledgeScreen", "broker")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("rePledgeScreen", "amount")}</th>
                    <th className="px-3 py-3 text-right font-medium">{t("rePledgeScreen", "rate")}</th>
                    <th className="px-3 py-3 font-medium">{t("rePledgeScreen", "date")}</th>
                    <th className="px-3 py-3 font-medium">{t("rePledgeScreen", "status")}</th>
                    <th className="px-3 py-3 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-gold-soft/60 last:border-0">
                      <td className="px-3 py-3 font-mono">
                        <Link href={`/loans/${r.loanId}`} className="hover:text-wine hover:underline">
                          {r.loanNumber}
                        </Link>
                        <div className="text-[11px] text-ink-soft">{r.customerName}</div>
                      </td>
                      <td className="px-3 py-3">
                        {r.broker}
                        {r.receiptNumber && <div className="font-mono text-[11px] text-ink-soft">{r.receiptNumber}</div>}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">{r.amountPaise != null ? formatPaise(r.amountPaise) : "—"}</td>
                      <td className="px-3 py-3 text-right font-mono">{r.ratePercent != null ? `${r.ratePercent}%` : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-ink-soft">{r.pledgeDate}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            r.status === "active" ? "bg-wine text-onwine" : "bg-ivory-deep text-ink-soft"
                          }`}
                        >
                          {t("rePledgeScreen", r.status === "active" ? "filterActive" : "filterRedeemed")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-xs">
                        {r.status === "active" && (
                          <button onClick={() => markRedeemed(r.id)} className="text-wine hover:underline">
                            {t("rePledge", "markRedeemed")}
                          </button>
                        )}
                        <Link href={`/loans/${r.loanId}`} className="ml-3 text-wine hover:underline">
                          {t("rePledgeScreen", "viewLoan")}
                        </Link>
                        <Link href={`/receipt/${r.loanId}`} className="ml-3 text-ink-soft hover:underline">
                          {t("loanDetail", "printReceipt").split(" ")[0]}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-ink-soft">{t("rePledgeScreen", "candidatesHint")}</p>
          {candidates.length === 0 ? (
            <div className="ledger-card rounded-2xl p-10 text-center text-ink-soft">{t("rePledgeScreen", "candidatesEmpty")}</div>
          ) : (
            <div className="flex flex-col gap-3">
              {candidates.map((c) => (
                <div key={c.loanId} className="ledger-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
                  <div>
                    <Link href={`/loans/${c.loanId}`} className="font-mono font-semibold text-wine hover:underline">
                      {c.loanNumber}
                    </Link>
                    <span className="ml-2 text-sm text-ink-soft">{c.customerName}</span>
                    <div className="mt-1 font-mono text-sm text-ink">
                      {t("rePledgeScreen", "assessed")} {formatPaise(c.assessedPaise)}
                      <span className="text-ink-soft"> · </span>
                      {t("rePledgeScreen", "loanGiven")} {formatPaise(c.principalPaise)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-2xl font-bold text-wine">{c.ltvPercent}%</div>
                    <div className="text-[11px] uppercase tracking-wide text-ink-soft">{t("rePledgeScreen", "ltv")}</div>
                    <Link href={`/loans/${c.loanId}`} className="mt-1 inline-block text-xs text-wine hover:underline">
                      {t("rePledgeScreen", "viewLoan")} →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        active ? "border-wine text-wine" : "border-transparent text-ink-soft hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
