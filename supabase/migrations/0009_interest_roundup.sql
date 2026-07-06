-- Sivabalan Finance — Phase 3: interest = round up to the next full month, min 1.
-- Replaces the previous 30-day / half-month proration. Apply after 0008.
--
-- Keeps compute_period_interest's signature, so calculate_interest / record_payment
-- pick up the new rule automatically. Matches src/lib/interest.ts exactly:
--   months = greatest(1, ceil(days / 30))

create or replace function compute_period_interest(
  p_principal_paise bigint,
  p_rate_percent numeric,
  p_start_date date,
  p_end_date date
) returns bigint
language plpgsql
immutable
as $$
declare
  v_total_days integer;
  v_interest_units numeric;
begin
  v_total_days := p_end_date - p_start_date;
  if v_total_days < 0 then
    raise exception 'end_date (%) must not be before start_date (%)', p_end_date, p_start_date;
  end if;

  -- Round up any partial month to the next full month, minimum 1 month.
  v_interest_units := greatest(1, ceil(v_total_days / 30.0));

  return round(p_principal_paise * (p_rate_percent / 100.0) * v_interest_units);
end;
$$;
