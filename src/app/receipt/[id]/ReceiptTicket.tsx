import { tamilSerif } from "../../fonts";

// Existing Tamil branding (matches the login page). The shops table stores the
// English name; this is the traditional Tamil shop name printed on the ticket.
const BRAND_NAME_TA = "சிவபாலன் நகை அடகு கடை";
const REDEMPTION_PERIOD_TA = "ஒரு மாதம்"; // default agreed redemption period (row 7)

export type ReceiptData = {
  loanNumber: string;
  principalPaise: number;
  pledgeItem: string;
  pledgeWeightGrams: number | null;
  loanDate: string;
  assessedValuePaise: number | null;
  customerName: string;
  customerAddress: string | null;
  customerPhone: string | null;
  shopName: string;
  ownerName: string | null;
  shopAddress: string | null;
  shopPhone: string | null;
  ratePercent: number | null;
  issuedBy: string | null;
  firstMonthInterestDeducted: boolean;
  firstMonthInterestPaise: number;
  closingPaymentPaise: number | null;
  closedDate: string | null;
};

function rupees(paise: number): string {
  return (paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SummaryRow({ ta, en, value, bold }: { ta: string; en: string; value: string; bold?: boolean }) {
  return (
    <tr className={`border border-black align-top ${bold ? "font-bold" : ""}`}>
      <td className="border border-black px-2 py-1.5" lang="ta">
        <span className={tamilSerif.className}>{ta}</span>
        <span className="ml-1 text-[10px] uppercase tracking-wide text-gray-600">{en}</span>
      </td>
      <td className="w-40 border border-black px-2 py-1.5 text-right">{value}</td>
    </tr>
  );
}

export function ReceiptTicket({ data }: { data: ReceiptData }) {
  const blankLine = (
    <span className="inline-block min-w-[60%] border-b border-dotted border-black">&nbsp;</span>
  );

  const rows: { n: number; ta: string; en: string; value: React.ReactNode }[] = [
    {
      n: 1,
      ta: "அடகு வைத்தவரின் பெயரும் விலாசமும்",
      en: "Pledger's name & address",
      value: (
        <span>
          {data.customerName}
          {data.customerAddress ? `, ${data.customerAddress}` : ""}
          {data.customerPhone ? ` · ${data.customerPhone}` : ""}
        </span>
      ),
    },
    { n: 2, ta: "தேதி", en: "Date", value: data.loanDate },
    { n: 3, ta: "கடன் தொகை", en: "Loan amount", value: `₹ ${rupees(data.principalPaise)}` },
    { n: 4, ta: "வட்டி விகிதம்", en: "Interest rate", value: data.ratePercent !== null ? `${data.ratePercent}%` : "—" },
    {
      n: 5,
      ta: "பொருளின் விபரம் / எடை",
      en: "Item description & weight",
      value: (
        <span>
          {data.pledgeItem}
          {data.pledgeWeightGrams != null ? ` — ${data.pledgeWeightGrams} g` : ""}
        </span>
      ),
    },
    {
      n: 6,
      ta: "பொருளின் மதிப்பு ரூபாய்",
      en: "Assessed value",
      value: data.assessedValuePaise != null ? `₹ ${rupees(data.assessedValuePaise)}` : blankLine,
    },
    { n: 7, ta: "மீட்பதற்கு ஒப்புக் கொண்ட காலம்", en: "Redemption period", value: REDEMPTION_PERIOD_TA },
    { n: 8, ta: "அடகு வைத்தவரின் கையெழுத்து", en: "Pledger's signature", value: blankLine },
    { n: 9, ta: "அடகு பிடிப்பவரின் கையெழுத்து", en: "Pledgee's signature", value: blankLine },
  ];

  return (
    <div className="receipt-sheet mx-auto max-w-2xl border-2 border-black bg-white p-6 text-black sm:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
        <div>
          <h1 className={`${tamilSerif.className} text-2xl font-bold leading-tight sm:text-3xl`} lang="ta">
            {BRAND_NAME_TA}
          </h1>
          {data.ownerName && <p className="mt-0.5 text-sm">Prop. {data.ownerName}</p>}
          <p className="mt-0.5 text-xs">
            {data.shopName}
            {data.shopAddress ? ` · ${data.shopAddress}` : ""}
          </p>
          {data.shopPhone && <p className="text-xs">Ph: {data.shopPhone}</p>}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs uppercase tracking-wide">Loan No.</div>
          <div className="font-mono text-lg font-bold">{data.loanNumber}</div>
        </div>
      </div>

      {/* Title + boxed principal */}
      <div className="flex items-center justify-between gap-4 py-3">
        <h2 className={`${tamilSerif.className} text-xl font-bold`} lang="ta">
          நகை அடகு சீட்டு
        </h2>
        <div className="border-2 border-black px-4 py-1 text-lg font-bold">Rs. {rupees(data.principalPaise)}/-</div>
      </div>

      {/* Numbered bordered rows */}
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.n} className="border border-black align-top">
              <td className="w-6 border border-black px-1 py-2 text-center font-bold">{r.n}</td>
              <td className="border border-black px-2 py-2" lang="ta">
                <div className={tamilSerif.className}>{r.ta}</div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{r.en}</div>
              </td>
              <td className="border border-black px-2 py-2">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Disbursement / closing summary — clarifies loan amount, deducted
          interest, cash actually handed over, and (if closed) closing payment. */}
      {(data.firstMonthInterestDeducted || data.closingPaymentPaise != null) && (
        <table className="mt-4 w-full border-collapse text-sm">
          <caption className="border border-b-0 border-black bg-gray-100 px-2 py-1 text-left text-xs font-bold uppercase tracking-wide">
            <span className={tamilSerif.className} lang="ta">வழங்கிய தொகை விவரம்</span> / Disbursement Summary
          </caption>
          <tbody>
            <SummaryRow ta="கடன் தொகை" en="Principal Amount" value={`Rs. ${rupees(data.principalPaise)}`} />
            {data.firstMonthInterestDeducted && (
              <>
                <SummaryRow
                  ta="முதல் மாத வட்டி கழிவு"
                  en="First Month Interest Deducted"
                  value={`− Rs. ${rupees(data.firstMonthInterestPaise)}`}
                />
                <SummaryRow
                  ta="வாடிக்கையாளருக்கு வழங்கிய பணம்"
                  en="Cash Disbursed to Customer"
                  value={`Rs. ${rupees(data.principalPaise - data.firstMonthInterestPaise)}`}
                  bold
                />
              </>
            )}
            {data.closingPaymentPaise != null && (
              <SummaryRow
                ta="முடிப்பு கட்டணம்"
                en={`Closing Payment${data.closedDate ? ` (${data.closedDate})` : ""}`}
                value={`Rs. ${rupees(data.closingPaymentPaise)}`}
                bold
              />
            )}
          </tbody>
        </table>
      )}

      {/* Footer signature — prints the issuer's name entered while creating the loan. */}
      <div className="mt-4 flex items-end justify-end">
        <div className="min-w-[45%] text-right text-sm">
          <div className={`${tamilSerif.className} mb-8 text-xs`} lang="ta">
            கையொப்பம் / Signature
          </div>
          <div className="border-t border-black pt-1">For: {BRAND_NAME_TA}</div>
          {(data.issuedBy || data.ownerName) && (
            <div className="mt-0.5 font-semibold">{data.issuedBy || data.ownerName}</div>
          )}
        </div>
      </div>
    </div>
  );
}
