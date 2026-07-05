import { formatPaise } from "@/lib/money";
import type { RePledgeRow } from "@/lib/rePledges";

export type RePledgeExportData = {
  shopName: string;
  title: string;
  columns: {
    loan: string;
    customer: string;
    broker: string;
    receipt: string;
    tag: string;
    amount: string;
    status: string;
    date: string;
    redeemed: string;
  };
  statusLabels: { active: string; redeemed: string };
  rows: RePledgeRow[];
  filenameBase: string;
};

const WINE: [number, number, number] = [94, 18, 36];
const IVORY: [number, number, number] = [250, 246, 236];

function statusLabel(d: RePledgeExportData, r: RePledgeRow) {
  return r.status === "redeemed" ? d.statusLabels.redeemed : d.statusLabels.active;
}

/** Client-side PDF via jsPDF + autoTable (libraries loaded lazily on call). */
export async function exportRePledgesPdf(data: RePledgeExportData): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...WINE);
  doc.text(`${data.shopName} — ${data.title}`, 14, 16);

  autoTable(doc, {
    startY: 22,
    head: [
      [
        data.columns.loan,
        data.columns.customer,
        data.columns.broker,
        data.columns.receipt,
        data.columns.tag,
        data.columns.amount,
        data.columns.status,
        data.columns.date,
        data.columns.redeemed,
      ],
    ],
    body: data.rows.map((r) => [
      r.loanNumber,
      r.customerName,
      r.broker,
      r.receiptNumber ?? "—",
      r.tagNumber ?? "—",
      r.amountPaise != null ? formatPaise(r.amountPaise) : "—",
      statusLabel(data, r),
      r.pledgeDate,
      r.redeemedDate ?? "—",
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: WINE, textColor: IVORY, halign: "left" },
  });

  doc.save(`${data.filenameBase}.pdf`);
}

/** Client-side .xlsx via ExcelJS. */
export async function exportRePledgesExcel(data: RePledgeExportData): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = data.shopName;
  const ws = wb.addWorksheet(data.title);

  const cols = data.columns;
  ws.columns = [
    { header: cols.loan, key: "loan", width: 12 },
    { header: cols.customer, key: "customer", width: 20 },
    { header: cols.broker, key: "broker", width: 22 },
    { header: cols.receipt, key: "receipt", width: 16 },
    { header: cols.tag, key: "tag", width: 12 },
    { header: cols.amount, key: "amount", width: 16 },
    { header: cols.status, key: "status", width: 12 },
    { header: cols.date, key: "date", width: 14 },
    { header: cols.redeemed, key: "redeemed", width: 14 },
  ];

  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFAF6EC" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5E1224" } };
  });

  for (const r of data.rows) {
    const row = ws.addRow({
      loan: r.loanNumber,
      customer: r.customerName,
      broker: r.broker,
      receipt: r.receiptNumber ?? "",
      tag: r.tagNumber ?? "",
      amount: r.amountPaise != null ? r.amountPaise / 100 : "",
      status: statusLabel(data, r),
      date: r.pledgeDate,
      redeemed: r.redeemedDate ?? "",
    });
    row.getCell("amount").numFmt = '"₹"#,##0.00';
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.filenameBase}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
