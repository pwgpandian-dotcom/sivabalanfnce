import { formatPaise } from "@/lib/money";

export type ReportExportData = {
  shopName: string;
  reportTitle: string;
  periodLabel: string;
  columns: { month: string; opened: string; closed: string; interest: string; total: string };
  rows: { label: string; opened: number; closed: number; interestPaise: number }[];
  totals: { opened: number; closed: number; interestPaise: number };
  filenameBase: string;
};

const WINE: [number, number, number] = [94, 18, 36];
const IVORY: [number, number, number] = [250, 246, 236];

/** Client-side PDF via jsPDF + autoTable. Libraries are loaded lazily on call. */
export async function exportReportPdf(data: ReportExportData): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...WINE);
  doc.text(data.shopName, 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90, 74, 61);
  doc.text(`${data.reportTitle} — ${data.periodLabel}`, 14, 25);

  autoTable(doc, {
    startY: 30,
    head: [[data.columns.month, data.columns.opened, data.columns.closed, data.columns.interest]],
    body: data.rows.map((r) => [
      r.label,
      String(r.opened),
      String(r.closed),
      formatPaise(r.interestPaise),
    ]),
    foot: [
      [
        data.columns.total,
        String(data.totals.opened),
        String(data.totals.closed),
        formatPaise(data.totals.interestPaise),
      ],
    ],
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: WINE, textColor: IVORY, halign: "left" },
    footStyles: { fillColor: [241, 234, 217], textColor: WINE, fontStyle: "bold" },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  doc.save(`${data.filenameBase}.pdf`);
}

/** Client-side .xlsx via ExcelJS. Interest is written as a numeric rupee value. */
export async function exportReportExcel(data: ReportExportData): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;

  const wb = new ExcelJS.Workbook();
  wb.creator = data.shopName;
  const ws = wb.addWorksheet(data.reportTitle);

  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = `${data.shopName} — ${data.reportTitle} (${data.periodLabel})`;
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF5E1224" } };

  const headerRowIndex = 3;
  ws.columns = [
    { key: "month", width: 16 },
    { key: "opened", width: 14 },
    { key: "closed", width: 14 },
    { key: "interest", width: 20 },
  ];

  const header = ws.getRow(headerRowIndex);
  header.values = [data.columns.month, data.columns.opened, data.columns.closed, data.columns.interest];
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFAF6EC" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5E1224" } };
    cell.alignment = { horizontal: "left" };
  });

  data.rows.forEach((r) => {
    const row = ws.addRow({
      month: r.label,
      opened: r.opened,
      closed: r.closed,
      interest: r.interestPaise / 100,
    });
    row.getCell("interest").numFmt = '"₹"#,##0.00';
  });

  const totalRow = ws.addRow({
    month: data.columns.total,
    opened: data.totals.opened,
    closed: data.totals.closed,
    interest: data.totals.interestPaise / 100,
  });
  totalRow.font = { bold: true };
  totalRow.getCell("interest").numFmt = '"₹"#,##0.00';

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, `${data.filenameBase}.xlsx`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
