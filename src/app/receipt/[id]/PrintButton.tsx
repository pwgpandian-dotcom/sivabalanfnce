"use client";

import Link from "next/link";

export function PrintButton({ loanId }: { loanId: string }) {
  return (
    <div className="no-print mx-auto mt-6 flex max-w-2xl items-center justify-between px-4">
      <Link href={`/loans/${loanId}`} className="text-sm text-wine hover:underline">
        ← Back to loan
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg bg-wine px-5 py-2 text-sm font-medium text-onwine transition-colors hover:bg-wine-deep"
      >
        Print / Download Receipt
      </button>
    </div>
  );
}
