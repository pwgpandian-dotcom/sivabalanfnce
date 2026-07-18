# Applying migrations (Supabase → SQL Editor)

Run these **in order** in the Supabase dashboard SQL Editor for the production
project. They are all idempotent (`create ... if not exists` / `create or
replace`), so re-running an already-applied one is safe.

The live error **`relation "loan_edit_history" does not exist`** means the
project is currently only up to `0006`. Apply everything from `0007` onward:

| # | File | What it adds |
|---|------|--------------|
| 0007 | `migrations/0007_loan_fields_audit.sql` | item_type, remarks, issuer/receiver, **loan_edit_history** table + `edit_loan` |
| 0008 | `migrations/0008_repledge_management.sql` | pawn_brokers, re-pledge RPCs + history (**fixes the Re-Pledge module**) |
| 0009 | `migrations/0009_interest_roundup.sql` | (superseded by 0011's mode-aware version, but keep the order) |
| 0010 | `migrations/0010_phase4_text_issuer_item_count_logo.sql` | item_count, free-text issuer/receiver, shop logo, delete_re_pledge |
| 0011 | `migrations/0011_fixes_enhancements.sql` | **loan-number reuse, interest modes, first-month interest, customer fields** |
| 0012 | `migrations/0012_full_month_calendar.sql` | **Full Month = calendar months from the loan date, partial month rounds up** (matches `src/lib/interest.ts`) |

## After applying

Nothing else is required in the DB. The app code already targets the new
functions/columns and falls back gracefully where a table might be missing.

## What 0011 changes (business logic)

- **Loan numbers** now reuse the smallest number freed by a *permanently
  deleted* loan; otherwise the next sequential number. Active/closed loans that
  still exist are never reused.
- **Interest mode** per loan: `full_month` (default — completed months, no extra
  month), `half_month` (+0.5 for ≤15 leftover days), `exact_days` (day-precise).
- **First-month interest**: when deducted at issuance, one month's interest is
  recorded as an interest payment on the loan date, so the customer's handed-over
  amount is `principal − first month interest`, and the closing settlement
  automatically credits it (no double charge).
- **Customers** gain `email`, `id_proof_type`, `id_number`, `notes`.
