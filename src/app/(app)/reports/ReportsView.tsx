"use client";

import { useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise } from "@/lib/money";
import { monthLabel } from "@/lib/month";
import type { MonthlyReportRow } from "@/lib/reports";
import { exportReportPdf, exportReportExcel, type ReportExportData } from "./reportExport";
import { ReportsIcon } from "../icons";

export function ReportsView({ rows, shopName }: { rows: MonthlyReportRow[]; shopName: string }) {
  const { t, locale } = useLocale();
  const [range, setRange] = useState<6 | 12>(6);
  const [busy, setBusy] = useState<null | "pdf" | "excel">(null);

  const sliced = useMemo(() => rows.slice(-range), [rows, range]);

  const totals = useMemo(
    () =>
      sliced.reduce(
        (acc, r) => ({
          opened: acc.opened + r.opened,
          closed: acc.closed + r.closed,
          interestPaise: acc.interestPaise + r.interestCollectedPaise,
        }),
        { opened: 0, closed: 0, interestPaise: 0 }
      ),
    [sliced]
  );

  function buildExportData(): ReportExportData {
    const periodLabel =
      sliced.length > 0
        ? `${monthLabel(sliced[0].monthKey, locale)} – ${monthLabel(sliced[sliced.length - 1].monthKey, locale)}`
        : "";
    return {
      shopName: shopName || "Sivabalan Finance",
      reportTitle: t("reports", "reportTitle"),
      periodLabel,
      columns: {
        month: t("reports", "month"),
        opened: t("reports", "opened"),
        closed: t("reports", "closed"),
        interest: t("reports", "interestCollected"),
        total: t("reports", "total"),
      },
      rows: sliced.map((r) => ({
        label: monthLabel(r.monthKey, locale),
        opened: r.opened,
        closed: r.closed,
        interestPaise: r.interestCollectedPaise,
      })),
      totals,
      filenameBase: `sivabalan-report-${range}m`,
    };
  }

  async function handleExport(kind: "pdf" | "excel") {
    setBusy(kind);
    try {
      const data = buildExportData();
      if (kind === "pdf") await exportReportPdf(data);
      else await exportReportExcel(data);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-gold-soft bg-ivory-deep p-0.5 text-xs font-medium">
          {([6, 12] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 transition-colors ${
                range === r ? "bg-wine text-onwine" : "text-ink-soft hover:text-ink"
              }`}
            >
              {t("chart", r === 6 ? "range6" : "range12")}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("pdf")}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-wine px-4 py-2 text-sm font-medium text-onwine transition-colors hover:bg-wine-deep disabled:opacity-50"
          >
            <ReportsIcon className="h-4 w-4" />
            {busy === "pdf" ? t("reports", "generating") : t("reports", "exportPdf")}
          </button>
          <button
            onClick={() => handleExport("excel")}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-wine bg-ivory px-4 py-2 text-sm font-medium text-wine transition-colors hover:bg-ivory-deep disabled:opacity-50"
          >
            <ReportsIcon className="h-4 w-4" />
            {busy === "excel" ? t("reports", "generating") : t("reports", "exportExcel")}
          </button>
        </div>
      </div>

      <div className="ledger-card overflow-x-auto rounded-2xl">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gold-soft bg-ivory-deep text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3 font-medium">{t("reports", "month")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("reports", "opened")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("reports", "closed")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("reports", "interestCollected")}</th>
            </tr>
          </thead>
          <tbody>
            {sliced.map((r) => (
              <tr key={r.monthKey} className="border-b border-gold-soft/60 last:border-0">
                <td className="px-4 py-2.5 font-mono">{monthLabel(r.monthKey, locale)}</td>
                <td className="px-4 py-2.5 text-right font-mono">{r.opened}</td>
                <td className="px-4 py-2.5 text-right font-mono">{r.closed}</td>
                <td className="px-4 py-2.5 text-right font-mono text-wine">
                  {formatPaise(r.interestCollectedPaise)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gold-soft bg-ivory-deep font-semibold">
              <td className="px-4 py-3">{t("reports", "total")}</td>
              <td className="px-4 py-3 text-right font-mono">{totals.opened}</td>
              <td className="px-4 py-3 text-right font-mono">{totals.closed}</td>
              <td className="px-4 py-3 text-right font-mono text-wine">
                {formatPaise(totals.interestPaise)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
