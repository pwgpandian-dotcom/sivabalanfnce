-- Sivabalan Finance — Feature 3: per-shop loan sequence + manual override.
-- Additive. Apply in Supabase Dashboard -> SQL Editor after 0003_receipt.sql.
--
-- The shop has ~1700 prior paper loans, so app-created loans continue from 1701.

alter table shops
  add column if not exists next_loan_sequence integer not null default 1;

-- Start Sivabalan Finance at 1701 (guard keeps re-runs from lowering an advanced value).
update shops
  set next_loan_sequence = 1701
  where name = 'Sivabalan Finance' and next_loan_sequence < 1701;

-- Recreate create_loan: auto-generate 'SF-<seq>' + increment when no loan number
-- is supplied; use the supplied number as-is (and DON'T touch the sequence) when
-- a manual number is given. unique(shop_id, loan_number) still guards duplicates.
drop function if exists create_loan(uuid, bigint, text, numeric, date, numeric, text, bigint);

create or replace function create_loan(
  p_customer_id uuid,
  p_principal_paise bigint,
  p_pledge_item_description text,
  p_pledge_weight_grams numeric,
  p_loan_date date,
  p_initial_rate_percent numeric,
  p_loan_number text default null,
  p_assessed_value_paise bigint default null
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
begin
  select shop_id into v_shop_id from customers where id = p_customer_id;
  if v_shop_id is null then
    raise exception 'customer % not found', p_customer_id;
  end if;

  if not has_shop_access(v_shop_id) then
    raise exception 'not authorized for this shop';
  end if;

  if p_loan_number is null or btrim(p_loan_number) = '' then
    -- Auto: lock the shop row, take the current sequence, then advance it.
    select next_loan_sequence into v_seq from shops where id = v_shop_id for update;
    update shops set next_loan_sequence = v_seq + 1 where id = v_shop_id;
    v_loan_number := 'SF-' || v_seq;
  else
    -- Manual override (e.g. back-filling an old paper number). Sequence untouched.
    v_loan_number := btrim(p_loan_number);
  end if;

  insert into loans (
    shop_id, loan_number, customer_id, principal_paise,
    pledge_item_description, pledge_weight_grams, loan_date, assessed_value_paise
  ) values (
    v_shop_id, v_loan_number, p_customer_id, p_principal_paise,
    p_pledge_item_description, p_pledge_weight_grams, p_loan_date, p_assessed_value_paise
  )
  returning id into v_loan_id;

  insert into interest_rate_segments (loan_id, rate_percent, effective_from, effective_to)
  values (v_loan_id, p_initial_rate_percent, p_loan_date, null);

  return v_loan_id;
end;
$$;

revoke all on function create_loan(uuid, bigint, text, numeric, date, numeric, text, bigint) from public;
grant execute on function create_loan(uuid, bigint, text, numeric, date, numeric, text, bigint) to authenticated;
