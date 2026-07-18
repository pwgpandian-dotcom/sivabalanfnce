-- Sivabalan Finance — Full Month = calendar months elapsed, partial month rounds up.
-- Apply after 0011.
--
-- Replaces the "full_month = greatest(1, floor(days/30))" rule with a calendar
-- rule that matches how the counter is stated on the closing screen and in
-- src/lib/interest.ts:
--   full_month : whole calendar months from loan date, with ANY leftover days
--                counting as one more full month; an exact monthly anniversary
--                stays whole. Minimum 1.
--                May 1 → Jun 1 = 1,  May 1 → Jun 2 = 2,  May 1 → Jul 7 = 3.
--   half_month : unchanged (30-day months + ≤15d → +0.5, else +1), min 1.
--   exact_days : unchanged (days / 30).
--
-- Keeps compute_period_interest's signature so calculate_interest / record_payment
-- pick up the new rule automatically.
create or replace function compute_period_interest(
  p_principal_paise bigint,
  p_rate_percent numeric,
  p_start_date date,
  p_end_date date,
  p_mode text default 'full_month'
) returns bigint
language plpgsql
immutable
as $$
declare
  v_total_days integer;
  v_full_months integer;
  v_extra_days integer;
  v_age interval;
  v_units numeric;
begin
  v_total_days := p_end_date - p_start_date;
  if v_total_days < 0 then
    raise exception 'end_date (%) must not be before start_date (%)', p_end_date, p_start_date;
  end if;

  if p_mode = 'exact_days' then
    v_units := v_total_days / 30.0;
  elsif p_mode = 'half_month' then
    v_full_months := floor(v_total_days / 30.0);
    v_extra_days := v_total_days - (v_full_months * 30);
    v_units := v_full_months + (case when v_extra_days = 0 then 0
                                     when v_extra_days <= 15 then 0.5
                                     else 1 end);
    v_units := greatest(1, v_units);
  else -- full_month: whole calendar months, any leftover days round up to +1 month
    v_age := age(p_end_date::timestamp, p_start_date::timestamp);
    v_units := extract(year from v_age) * 12 + extract(month from v_age);
    if extract(day from v_age) > 0 then
      v_units := v_units + 1;
    end if;
    v_units := greatest(1, v_units);
  end if;

  return round(p_principal_paise * (p_rate_percent / 100.0) * v_units);
end;
$$;
