"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatPaise, formatPaiseAscii } from "@/lib/money";
import type { ReportData, ReportLoan } from "@/lib/reports";

type Preset = "today" | "yesterday" | "week" | "month" | "lastMonth" | "6" | "12" | "custom";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ReportsView({ data, shopName }: { data: ReportData; shopName: string }) {
  const { t } = useLocale();
  const [preset, setPreset] = useState<Preset>("month");
  const [customFrom, setCustomFrom] = useState(fmt(new Date()));
  const [customTo, setCustomTo] = useState(fmt(new Date()));
  const [busy, setBusy] = useState<null | "pdf" | "excel">(null);

  const [start, end] = useMemo<[string, string]>(() => {
    const now = new Date();
    const today = fmt(now);
    switch (preset) {
      case "today":
        return [today, today];
      case "yesterday": {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return [fmt(y), fmt(y)];
      }
      case "week": {
        const s = new Date(now);
        s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // Monday start
        return [fmt(s), today];
      }
      case "month":
        return [fmt(new Date(now.getFullYear(), now.getMonth(), 1)), today];
      case "lastMonth":
        return [fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)), fmt(new Date(now.getFullYear(), now.getMonth(), 0))];
      case "6":
        return [fmt(new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())), today];
      case "12":
        return [fmt(new Date(now.getFullYear(), now.getMonth() - 12, now.getDate())), today];
      case "custom":
        return [customFrom, customTo];
    }
  }, [preset, customFrom, customTo]);

  const inRange = useCallback((d: string | null) => Boolean(d) && d! >= start && d! <= end, [start, end]);

  const loansInRange = useMemo(() => data.loans.filter((l) => inRange(l.loanDate)), [data.loans, inRange]);
  const summary = useMemo(() => {
    const loanAmount = loansInRange.reduce((s, l) => s + l.principalPaise, 0);
    const closed = data.loans.filter((l) => inRange(l.closedDate)).length;
    let returned = 0;
    let interest = 0;
    for (const p of data.payments)
      if (inRange(p.paymentDate)) {
        returned += p.amountPaise;
        interest += p.interestPaise;
      }
    const rePledged = data.rePledgeDates.filter((d) => inRange(d)).length;
    const active = data.loans.filter((l) => l.status === "active").length;
    const totalInterest = data.payments.reduce((s, p) => s + p.interestPaise, 0);
    return { loansCount: loansInRange.length, loanAmount, closed, returned, interest, rePledged, active, totalInterest };
  }, [loansInRange, data, inRange]);

  async function handleExport(kind: "pdf" | "excel") {
    setBusy(kind);
    try {
      const cols = {
        loan: t("reports", "month"),
        customer: t("reports", "customer"),
        item: t("reports", "itemType"),
        date: t("reports", "date"),
        amount: t("reports", "loanAmount"),
        status: t("reports", "status"),
      };
      const rows = loansInRange;
      const title = `${t("reports", "reportTitle")} · ${start} → ${end}`;

      // Single source of truth for the summary — used identically by PDF and Excel.
      // Exports use the ASCII "Rs." form since jsPDF's fonts lack the ₹ glyph.
      const summaryRows: [string, string][] = [
        [t("reports", "loansCount"), String(summary.loansCount)],
        [t("reports", "loanAmount"), formatPaiseAscii(summary.loanAmount)],
        [t("reports", "interestCollected"), formatPaiseAscii(summary.interest)],
        [t("reports", "totalInterest"), formatPaiseAscii(summary.totalInterest)],
        [t("reports", "returned"), formatPaiseAscii(summary.returned)],
        [t("reports", "outstanding"), formatPaiseAscii(data.outstandingPaise)],
        [t("reports", "activeCount"), String(summary.active)],
        [t("reports", "closedCount"), String(summary.closed)],
        [t("reports", "rePledged"), String(summary.rePledged)],
      ];
      const detailHead = [cols.loan, cols.customer, cols.item, cols.date, cols.amount, cols.status];
      const detailBody = rows.map((r: ReportLoan) => [
        r.loanNumber,
        r.customerName,
        r.itemType ?? "—",
        r.loanDate,
        formatPaiseAscii(r.principalPaise),
        r.status,
      ]);
      const WINE: [number, number, number] = [94, 18, 36];
      const IVORY: [number, number, number] = [250, 246, 236];

      if (kind === "pdf") {
        const { jsPDF } = await import("jspdf");
        const autoTable = (await import("jspdf-autotable")).default;
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.setTextColor(...WINE);
        doc.text(`${shopName} — ${title}`, 14, 16);

        // Summary block.
        autoTable(doc, {
          startY: 24,
          head: [[t("reports", "summaryHeading"), ""]],
          body: summaryRows,
          theme: "grid",
          tableWidth: 96,
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: WINE, textColor: IVORY },
          columnStyles: { 0: { fontStyle: "bold", textColor: [90, 74, 61] }, 1: { halign: "right" } },
        });
        const afterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

        // Detail table.
        autoTable(doc, {
          startY: afterSummary,
          head: [detailHead],
          body: detailBody,
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: WINE, textColor: IVORY },
        });
        doc.save(`sivabalan-report-${start}_${end}.pdf`);
      } else {
        const ExcelJS = (await import("exceljs")).default;
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Report");
        const wineArgb = "FF5E1224";
        const ivoryArgb = "FFFAF6EC";
        const fillHeader = (row: import("exceljs").Row) =>
          row.eachCell((c) => {
            c.font = { bold: true, color: { argb: ivoryArgb } };
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: wineArgb } };
          });

        // Title.
        const titleRow = ws.addRow([`${shopName} — ${title}`]);
        titleRow.getCell(1).font = { bold: true, size: 12, color: { argb: wineArgb } };

        // Summary block (identical to the PDF).
        fillHeader(ws.addRow([t("reports", "summaryHeading"), ""]));
        for (const [label, value] of summaryRows) {
          const r = ws.addRow([label, value]);
          r.getCell(1).font = { bold: true };
        }
        ws.addRow([]); // spacer

        // Detail table.
        fillHeader(ws.addRow(detailHead));
        for (const r of rows) {
          const row = ws.addRow([r.loanNumber, r.customerName, r.itemType ?? "", r.loanDate, r.principalPaise / 100, r.status]);
          row.getCell(5).numFmt = '"Rs. "#,##0.00';
        }

        // Column widths.
        [16, 22, 12, 14, 16, 12].forEach((w, i) => (ws.getColumn(i + 1).width = w));

        const buf = await wb.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sivabalan-report-${start}_${end}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } finally {
      setBusy(null);
    }
  }

  const presets: Preset[] = ["today", "yesterday", "week", "month", "lastMonth", "6", "12", "custom"];
  const presetLabel: Record<Preset, string> = {
    today: t("reports", "rToday"),
    yesterday: t("reports", "rYesterday"),
    week: t("reports", "rWeek"),
    month: t("reports", "rMonth"),
    lastMonth: t("reports", "rLastMonth"),
    "6": t("reports", "r6"),
    "12": t("reports", "r12"),
    custom: t("reports", "rCustom"),
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              preset === p ? "border-wine bg-wine text-onwine" : "border-gold-soft text-ink-soft hover:text-ink"
            }`}
          >
            {presetLabel[p]}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={() => handleExport("pdf")} disabled={busy !== null} className="rounded-lg bg-wine px-3 py-1.5 text-xs font-medium text-onwine hover:bg-wine-deep disabled:opacity-50">
            {busy === "pdf" ? t("reports", "generating") : t("reports", "exportPdf")}
          </button>
          <button onClick={() => handleExport("excel")} disabled={busy !== null} className="rounded-lg border border-wine px-3 py-1.5 text-xs font-medium text-wine hover:bg-ivory-deep disabled:opacity-50">
            {busy === "excel" ? t("reports", "generating") : t("reports", "exportExcel")}
          </button>
        </div>
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("reports", "from")}
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono text-ink outline-none focus:border-wine" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            {t("reports", "to")}
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-gold-soft bg-ivory px-3 py-2 font-mono text-ink outline-none focus:border-wine" />
          </label>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Stat label={t("reports", "loansCount")} value={String(summary.loansCount)} />
        <Stat label={t("reports", "loanAmount")} value={formatPaise(summary.loanAmount)} />
        <Stat label={t("reports", "returned")} value={formatPaise(summary.returned)} />
        <Stat label={t("reports", "outstanding")} value={formatPaise(data.outstandingPaise)} />
        <Stat label={t("reports", "interestCollected")} value={formatPaise(summary.interest)} gold />
        <Stat label={t("reports", "totalInterest")} value={formatPaise(summary.totalInterest)} gold />
        <Stat label={t("reports", "activeCount")} value={String(summary.active)} />
        <Stat label={t("reports", "closedCount")} value={String(summary.closed)} />
      </div>
      <div className="text-sm text-ink-soft">
        {t("reports", "rePledged")}: <span className="font-mono text-wine">{summary.rePledged}</span> · {start} → {end}
      </div>

      {/* Detail table */}
      <div className="ledger-card overflow-x-auto rounded-2xl">
        <div className="border-b border-gold-soft px-4 py-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
          {t("reports", "detail")}
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gold-soft bg-ivory-deep text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-2 font-medium">{t("reports", "month")}</th>
              <th className="px-4 py-2 font-medium">{t("reports", "customer")}</th>
              <th className="px-4 py-2 font-medium">{t("reports", "itemType")}</th>
              <th className="px-4 py-2 font-medium">{t("reports", "date")}</th>
              <th className="px-4 py-2 text-right font-medium">{t("reports", "loanAmount")}</th>
              <th className="px-4 py-2 font-medium">{t("reports", "status")}</th>
            </tr>
          </thead>
          <tbody>
            {loansInRange.map((l) => (
              <tr key={l.id} className="border-b border-gold-soft/50 last:border-0">
                <td className="px-4 py-2 font-mono">{l.loanNumber}</td>
                <td className="px-4 py-2">{l.customerName}</td>
                <td className="px-4 py-2">{l.itemType ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-2 font-mono text-ink-soft">{l.loanDate}</td>
                <td className="px-4 py-2 text-right font-mono">{formatPaise(l.principalPaise)}</td>
                <td className="px-4 py-2">{l.status}</td>
              </tr>
            ))}
            {loansInRange.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-soft">
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="ledger-card rounded-2xl p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">{label}</div>
      <div className={`mt-1 font-mono text-lg font-bold ${gold ? "text-gold" : "text-wine"}`}>{value}</div>
    </div>
  );
}
