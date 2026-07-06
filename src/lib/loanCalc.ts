/**
 * Single loan-calculation engine shared by the New Loan form, the Loan
 * Calculator, the closing settlement and the standalone calculator page, so
 * every screen shows the same figures. Built on the mode-aware primitives in
 * interest.ts. All amounts are integer paise.
 */
import {
  interestForMonths,
  monthsForPeriod,
  type InterestMode,
  DEFAULT_INTEREST_MODE,
} from "@/lib/interest";

export interface LoanCalcInput {
  principalPaise: number;
  ratePercent: number;
  startDate: Date;
  /** Closing / as-of date. */
  endDate: Date;
  mode?: InterestMode;
  /** When true, one month's interest is deducted from the amount handed over. */
  deductFirstMonthInterest?: boolean;
}

export interface LoanCalcResult {
  months: number;
  monthlyInterestPaise: number;
  totalInterestPaise: number;
  firstMonthInterestPaise: number;
  /** Cash actually handed to the customer at issuance (principal − deducted interest). */
  amountGivenPaise: number;
  /** Interest still owed at closing (total − any first month already deducted). */
  balanceInterestPaise: number;
  /** Principal + balance interest — what the customer repays to redeem. */
  finalSettlementPaise: number;
}

export function computeLoan({
  principalPaise,
  ratePercent,
  startDate,
  endDate,
  mode = DEFAULT_INTEREST_MODE,
  deductFirstMonthInterest = false,
}: LoanCalcInput): LoanCalcResult {
  const months = monthsForPeriod(startDate, endDate, mode);
  const totalInterestPaise = interestForMonths(principalPaise, ratePercent, months);
  const monthlyInterestPaise = interestForMonths(principalPaise, ratePercent, 1);
  const firstMonthInterestPaise = deductFirstMonthInterest ? monthlyInterestPaise : 0;
  const amountGivenPaise = principalPaise - firstMonthInterestPaise;
  const balanceInterestPaise = Math.max(0, totalInterestPaise - firstMonthInterestPaise);
  const finalSettlementPaise = principalPaise + balanceInterestPaise;

  return {
    months,
    monthlyInterestPaise,
    totalInterestPaise,
    firstMonthInterestPaise,
    amountGivenPaise,
    balanceInterestPaise,
    finalSettlementPaise,
  };
}
