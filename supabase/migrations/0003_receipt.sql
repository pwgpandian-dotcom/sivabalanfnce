-- Sivabalan Finance — Feature 1: printable pledge-ticket receipt support.
-- Additive. Apply in Supabase Dashboard -> SQL Editor (same as prior migrations).
--
-- Adds shop contact fields (for the receipt header) and an optional assessed
-- value on loans (ticket row 6). Recreates create_loan to accept the assessed
-- value. Fill in each shop's owner_name / address / phone afterwards, e.g.:
--   update shops set owner_name = 'K. Sivabalan',
--                    address    = '123 Bazaar Street, Karur',
--                    phone      = '+91 98765 43210'
--   where name = 'Sivabalan Finance';

alter table shops
  add column if not exists owner_name text,
  add column if not exists address text,
  add column if not exists phone text;

alter table loans
  add column if not exists assessed_value_paise bigint;

-- Recreate create_loan with an optional assessed value (signature change → drop first).
drop function if exists create_loan(uuid, bigint, text, numeric, date, numeric, text);

create or replace function create_loan(
  p_customer_id uuid,
  p_principal_paise bigint,
  p_pledge_item_description text,
  p_pledge_weight_grams numeric,
  p_loan_date date,
  p_initial_rate_percent numeric,
  p_loan_number text,
  p_assessed_value_paise bigint default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_loan_id uuid;
begin
  select shop_id into v_shop_id from customers where id = p_customer_id;
  if v_shop_id is null then
    raise exception 'customer % not found', p_customer_id;
  end if;

  if not has_shop_access(v_shop_id) then
    raise exception 'not authorized for this shop';
  end if;

  insert into loans (
    shop_id, loan_number, customer_id, principal_paise,
    pledge_item_description, pledge_weight_grams, loan_date, assessed_value_paise
  ) values (
    v_shop_id, p_loan_number, p_customer_id, p_principal_paise,
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
