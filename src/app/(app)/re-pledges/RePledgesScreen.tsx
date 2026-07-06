"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise, toDateInputValue } from "@/lib/money";
import type { RePledgeRow, CandidateRow } from "@/lib/rePledges";
import { exportRePledgesPdf, exportRePledgesExcel } from "./rePledgeExport";
import { LoanActionsMenu } from "../LoanActionsMenu";

export function RePledgesScreen({
  rePledges,
  candidates,
  shopName,
}: {
  rePledges: RePledgeRow[];
  candidates: CandidateRow[];
  shopName: string;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [tab, setTab] = useState<"all" | "candidates">("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "redeemed">("all");
  const [busy, setBusy] = useState<null | "pdf" | "excel">(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rePledges.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!q) return true;
      return (
        r.broker.toLowerCase().includes(q) ||
        r.loanNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        (r.customerPhone ?? "").toLowerCase().includes(q) ||
        (r.receiptNumber ?? "").toLowerCase().includes(q) ||
        (r.tagNumber ?? "").toLowerCase().includes(q)
      );
    });
  }, [rePledges, search, status]);

  async function handleExport(kind: "pdf" | "excel") {
    setBusy(kind);
    try {
      const payload = {
        shopName: shopName || "Sivabalan Finance",
        title: t("rePledgeScreen", "reportTitle"),
        columns: {
          loan: t("rePledgeScreen", "loan"),
          customer: t("rePledgeScreen", "customer"),
          broker: t("rePledgeScreen", "broker"),
          receipt: t("rePledge", "receiptNumber"),
          tag: t("rePledgeScreen", "tag"),
          amount: t("rePledgeScreen", "amount"),
          status: t("rePledgeScreen", "status"),
          date: t("rePledgeScreen", "date"),
          redeemed: t("rePledgeScreen", "redeemedDate"),
        },
        statusLabels: { active: t("rePledgeScreen", "filterActive"), redeemed: t("rePledgeScreen", "filterRedeemed") },
        rows: filtered,
        filenameBase: "sivabalan-repledges",
      };
      if (kind === "pdf") await exportRePledgesPdf(payload);
      else await exportRePledgesExcel(payload);
    } finally {
      setBusy(null);
    }
  }

  // Redeem via the RPC (not a raw update) so it records re_pledge_history and
  // stamps updated_by/updated_at — matching the loan-detail redeem path.
  async function markRedeemed(id: string) {
    if (!window.confirm(t("rePledge", "redeemConfirm"))) return;
    const today = toDateInputValue();
    const { error: rpcErr } = await supabase.rpc("redeem_re_pledge", { p_id: id, p_redeemed_date: today });
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    setError(null);
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
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => handleExport("pdf")}
                disabled={busy !== null || filtered.length === 0}
                className="rounded-lg bg-wine px-3 py-1.5 text-xs font-medium text-onwine hover:bg-wine-deep disabled:opacity-50"
              >
                {busy === "pdf" ? t("reports", "generating") : t("rePledgeScreen", "exportPdf")}
              </button>
              <button
                onClick={() => handleExport("excel")}
                disabled={busy !== null || filtered.length === 0}
                className="rounded-lg border border-wine px-3 py-1.5 text-xs font-medium text-wine hover:bg-ivory-deep disabled:opacity-50"
              >
                {busy === "excel" ? t("reports", "generating") : t("rePledgeScreen", "exportExcel")}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-wine-soft">{error}</p>}

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
                        <div className="flex items-center justify-end gap-3">
                          {r.status === "active" && (
                            <button onClick={() => markRedeemed(r.id)} className="text-wine hover:underline">
                              {t("rePledge", "markRedeemed")}
                            </button>
                          )}
                          <LoanActionsMenu loanId={r.loanId} loanNumber={r.loanNumber} customerName={r.customerName} />
                        </div>
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
