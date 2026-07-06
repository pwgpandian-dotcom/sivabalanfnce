-- Sivabalan Finance — Phase 5: fixes & enhancements.
-- Apply in Supabase Dashboard -> SQL Editor AFTER 0010_phase4_text_issuer_item_count_logo.sql.
-- Additive & backward-compatible (existing rows keep their data). Covers:
--   1. Loan number generation reuses permanently-deleted numbers (smallest gap).
--   2. Selectable interest mode per loan: full_month / half_month / exact_days.
--   3. First-month interest deduction at issuance.
--   4. Customer fields: email, id proof type, id number, notes.
-- The loan_edit_history table + edit_loan RPC already ship in 0007; re-run 0007..0010
-- first if this project has never had them applied (that is the cause of the
-- "relation loan_edit_history does not exist" error).

-- ---------------------------------------------------------------------------
-- 1. New columns
-- ---------------------------------------------------------------------------
alter table loans
  add column if not exists interest_mode text not null default 'full_month'
    check (interest_mode in ('full_month', 'half_month', 'exact_days')),
  add column if not exists first_month_interest_deducted boolean not null default false,
  add column if not exists first_month_interest_paise bigint not null default 0;

alter table customers
  add column if not exists email text,
  add column if not exists id_proof_type text,
  add column if not exists id_number text,
  add column if not exists notes text;

-- ---------------------------------------------------------------------------
-- 2. Interest calculation — mode-aware. compute_period_interest gains a mode
--    argument (default 'full_month'); calculate_interest reads the loan's mode.
--    full_month : greatest(1, floor(days/30))                       35d -> 1
--    half_month : greatest(1, floor + (extra=0?0 : extra<=15?0.5:1)) 35d -> 1.5
--    exact_days : days / 30                                          35d -> 1.1666…
-- ---------------------------------------------------------------------------
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
  v_units numeric;
begin
  v_total_days := p_end_date - p_start_date;
  if v_total_days < 0 then
    raise exception 'end_date (%) must not be before start_date (%)', p_end_date, p_start_date;
  end if;

  v_full_months := floor(v_total_days / 30.0);
  v_extra_days := v_total_days - (v_full_months * 30);

  if p_mode = 'exact_days' then
    v_units := v_total_days / 30.0;
  elsif p_mode = 'half_month' then
    v_units := v_full_months + (case when v_extra_days = 0 then 0
                                     when v_extra_days <= 15 then 0.5
                                     else 1 end);
    v_units := greatest(1, v_units);
  else -- full_month
    v_units := greatest(1, v_full_months);
  end if;

  return round(p_principal_paise * (p_rate_percent / 100.0) * v_units);
end;
$$;

create or replace function calculate_interest(
  p_loan_id uuid,
  p_as_of_date date
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan loans%rowtype;
  v_total bigint := 0;
  v_seg record;
  v_seg_end date;
begin
  select * into v_loan from loans where id = p_loan_id;
  if not found then
    raise exception 'loan % not found', p_loan_id;
  end if;
  if not has_shop_access(v_loan.shop_id) then
    raise exception 'not authorized for this shop';
  end if;

  for v_seg in
    select * from interest_rate_segments
    where loan_id = p_loan_id and effective_from <= p_as_of_date
    order by effective_from
  loop
    v_seg_end := least(coalesce(v_seg.effective_to, p_as_of_date), p_as_of_date);
    v_total := v_total + compute_period_interest(
      v_loan.principal_paise, v_seg.rate_percent, v_seg.effective_from, v_seg_end,
      coalesce(v_loan.interest_mode, 'full_month')
    );
  end loop;

  return v_total;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. create_loan — gap-filling loan numbers, interest mode, first-month interest.
--    (Signature changed → drop the old 14-arg version first.)
-- ---------------------------------------------------------------------------
drop function if exists create_loan(uuid, bigint, text, numeric, date, numeric, text, bigint, boolean, text, text, text, text, integer);

create or replace function create_loan(
  p_customer_id uuid,
  p_principal_paise bigint,
  p_pledge_item_description text,
  p_pledge_weight_grams numeric,
  p_loan_date date,
  p_initial_rate_percent numeric,
  p_loan_number text default null,
  p_assessed_value_paise bigint default null,
  p_is_migrated boolean default false,
  p_item_type text default 'gold',
  p_remarks text default null,
  p_issued_by text default null,
  p_received_by text default null,
  p_item_count integer default 1,
  p_interest_mode text default 'full_month',
  p_deduct_first_month_interest boolean default false,
  p_first_month_interest_paise bigint default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_loan_id uuid;
  v_loan_number text;
  v_seq integer;
  v_used integer[];
  v_min integer;
  v_max integer;
  v_fmi bigint;
begin
  select shop_id into v_shop_id from customers where id = p_customer_id;
  if v_shop_id is null then
    raise exception 'customer % not found', p_customer_id;
  end if;
  if not has_shop_access(v_shop_id) then
    raise exception 'not authorized for this shop';
  end if;

  if p_loan_number is null or btrim(p_loan_number) = '' then
    -- Auto number: reuse the smallest gap left by a permanently-deleted loan,
    -- otherwise the next sequential number. Lock the shop row to serialize.
    perform 1 from shops where id = v_shop_id for update;

    select array_agg(seq) into v_used from (
      select (substring(loan_number from '^SF-(\d+)$'))::int as seq
      from loans
      where shop_id = v_shop_id and loan_number ~ '^SF-\d+$'
    ) s;

    if v_used is null or array_length(v_used, 1) is null then
      select next_loan_sequence into v_seq from shops where id = v_shop_id;
    else
      v_min := (select min(x) from unnest(v_used) x);
      v_max := (select max(x) from unnest(v_used) x);
      select min(g) into v_seq
      from generate_series(v_min, v_max) g
      where not (g = any(v_used));
      if v_seq is null then
        v_seq := v_max + 1;
      end if;
    end if;

    update shops set next_loan_sequence = greatest(next_loan_sequence, v_seq + 1) where id = v_shop_id;
    v_loan_number := 'SF-' || v_seq;
  else
    v_loan_number := btrim(p_loan_number);
  end if;

  insert into loans (
    shop_id, loan_number, customer_id, principal_paise,
    pledge_item_description, pledge_weight_grams, loan_date, assessed_value_paise,
    is_migrated, item_type, remarks, issued_by, received_by, item_count, created_by,
    interest_mode, first_month_interest_deducted, first_month_interest_paise
  ) values (
    v_shop_id, v_loan_number, p_customer_id, p_principal_paise,
    p_pledge_item_description, p_pledge_weight_grams, p_loan_date, p_assessed_value_paise,
    p_is_migrated, coalesce(p_item_type, 'gold'), p_remarks,
    nullif(btrim(coalesce(p_issued_by, '')), ''), nullif(btrim(coalesce(p_received_by, '')), ''),
    greatest(1, coalesce(p_item_count, 1)), auth.uid(),
    coalesce(p_interest_mode, 'full_month'),
    coalesce(p_deduct_first_month_interest, false),
    0
  )
  returning id into v_loan_id;

  insert into interest_rate_segments (loan_id, rate_percent, effective_from, effective_to)
  values (v_loan_id, p_initial_rate_percent, p_loan_date, null);

  -- First-month interest deducted up front: the customer receives principal minus
  -- one month's interest. Record it as an interest payment dated the loan date so
  -- it counts as interest income and is credited at closing (no double charge).
  if coalesce(p_deduct_first_month_interest, false) then
    v_fmi := coalesce(
      p_first_month_interest_paise,
      round(p_principal_paise * (p_initial_rate_percent / 100.0))
    );
    if v_fmi > 0 then
      update loans set first_month_interest_paise = v_fmi where id = v_loan_id;
      insert into payments (
        loan_id, payment_date, amount_paise, payment_type, auto_calculated_interest_paise
      ) values (
        v_loan_id, p_loan_date, v_fmi, 'interest', v_fmi
      );
    end if;
  end if;

  return v_loan_id;
end;
$$;

revoke all on function create_loan(uuid, bigint, text, numeric, date, numeric, text, bigint, boolean, text, text, text, text, integer, text, boolean, bigint) from public;
grant execute on function create_loan(uuid, bigint, text, numeric, date, numeric, text, bigint, boolean, text, text, text, text, integer, text, boolean, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. edit_loan — adds interest_mode (snapshotted in history like other fields).
--    (Signature changed → drop the old 11-arg version first.)
-- ---------------------------------------------------------------------------
drop function if exists edit_loan(uuid, bigint, text, numeric, text, date, text, numeric, text, text, integer);

create or replace function edit_loan(
  p_loan_id uuid,
  p_principal_paise bigint,
  p_pledge_item_description text,
  p_pledge_weight_grams numeric,
  p_item_type text,
  p_loan_date date,
  p_remarks text,
  p_rate_percent numeric,
  p_issued_by text,
  p_received_by text,
  p_item_count integer,
  p_interest_mode text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan loans%rowtype;
  v_seg_id uuid;
  v_old_rate numeric;
begin
  select * into v_loan from loans where id = p_loan_id;
  if not found then
    raise exception 'loan % not found', p_loan_id;
  end if;
  if not has_shop_access(v_loan.shop_id) then
    raise exception 'not authorized for this shop';
  end if;

  select id, rate_percent into v_seg_id, v_old_rate
  from interest_rate_segments
  where loan_id = p_loan_id and effective_to is null
  order by effective_from desc
  limit 1;

  insert into loan_edit_history (loan_id, edited_by, previous)
  values (
    p_loan_id,
    auth.uid(),
    jsonb_build_object(
      'principal_paise', v_loan.principal_paise,
      'pledge_item_description', v_loan.pledge_item_description,
      'pledge_weight_grams', v_loan.pledge_weight_grams,
      'item_type', v_loan.item_type,
      'item_count', v_loan.item_count,
      'loan_date', v_loan.loan_date,
      'remarks', v_loan.remarks,
      'rate_percent', v_old_rate,
      'issued_by', v_loan.issued_by,
      'received_by', v_loan.received_by,
      'interest_mode', v_loan.interest_mode
    )
  );

  update loans set
    principal_paise = p_principal_paise,
    pledge_item_description = p_pledge_item_description,
    pledge_weight_grams = p_pledge_weight_grams,
    item_type = coalesce(p_item_type, item_type),
    item_count = greatest(1, coalesce(p_item_count, item_count)),
    loan_date = p_loan_date,
    remarks = p_remarks,
    issued_by = nullif(btrim(coalesce(p_issued_by, '')), ''),
    received_by = nullif(btrim(coalesce(p_received_by, '')), ''),
    interest_mode = coalesce(p_interest_mode, interest_mode),
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_loan_id;

  if v_seg_id is not null and p_rate_percent is not null and p_rate_percent <> v_old_rate then
    update interest_rate_segments set rate_percent = p_rate_percent where id = v_seg_id;
  end if;
end;
$$;

revoke all on function edit_loan(uuid, bigint, text, numeric, text, date, text, numeric, text, text, integer, text) from public;
grant execute on function edit_loan(uuid, bigint, text, numeric, text, date, text, numeric, text, text, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. close_loan — optional interest mode persisted before settling, so the
--    stored auto interest matches the mode used for the settlement.
--    (Signature changed → drop the old 5-arg version first.)
-- ---------------------------------------------------------------------------
drop function if exists close_loan(uuid, date, bigint, bigint, bigint);

create or replace function close_loan(
  p_loan_id uuid,
  p_closed_date date,
  p_final_payment_amount_paise bigint,
  p_manual_interest_override_paise bigint default null,
  p_manual_principal_override_paise bigint default null,
  p_interest_mode text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_status text;
begin
  select shop_id, status into v_shop_id, v_status from loans where id = p_loan_id;
  if v_shop_id is null then raise exception 'loan % not found', p_loan_id; end if;
  if not has_shop_access(v_shop_id) then raise exception 'not authorized for this shop'; end if;
  if v_status = 'closed' then raise exception 'loan % is already closed', p_loan_id; end if;

  if exists (select 1 from re_pledges where loan_id = p_loan_id and status = 'active') then
    raise exception 'redeem the active re-pledge before closing this loan';
  end if;

  if p_interest_mode is not null then
    update loans set interest_mode = p_interest_mode where id = p_loan_id;
  end if;

  perform record_payment(
    p_loan_id, p_closed_date, p_final_payment_amount_paise, 'full_closing',
    p_manual_interest_override_paise, p_manual_principal_override_paise
  );

  update interest_rate_segments set effective_to = p_closed_date
  where loan_id = p_loan_id and effective_to is null;

  update loans set status = 'closed', closed_date = p_closed_date where id = p_loan_id;
end;
$$;

revoke all on function close_loan(uuid, date, bigint, bigint, bigint, text) from public;
grant execute on function close_loan(uuid, date, bigint, bigint, bigint, text) to authenticated;
