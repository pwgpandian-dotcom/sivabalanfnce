"use client";

import { LoanCalculator } from "@/app/(app)/loans/new/LoanCalculator";

export function CalculatorForm() {
  return (
    <div className="ledger-card rounded-2xl p-6">
      <LoanCalculator />
    </div>
  );
}
