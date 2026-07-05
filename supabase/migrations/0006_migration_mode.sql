-- Sivabalan Finance — Migration Mode + old-loan back-fill support.
-- Additive. Apply in Supabase Dashboard -> SQL Editor after 0005_re_pledges.sql.
--
-- migration_mode_enabled: while true, staff can manually back-fill old paper
-- loans (with their original Pawn ID) via the "Add Old Loan Record" screen.
-- is_migrated marks those back-filled rows so they can be edited/deleted while
-- migration mode is on. receipt_photo_url is reserved for an optional receipt
-- image (upload wired separately once a Storage bucket exists).

alter table shops
  add column if not exists migration_mode_enabled boolean not null default true;

alter table loans
  add column if not exists is_migrated boolean not null default false,
  add column if not exists receipt_photo_url text;

-- Recreate create_loan with an is_migrated flag (signature change → drop first).
drop function if exists create_loan(uuid, bigint, text, numeric, date, numeric, text, bigint);

create or replace function create_loan(
  p_customer_id uuid,
  p_principal_paise bigint,
  p_pledge_item_description text,
  p_pledge_weight_grams numeric,
  p_loan_date date,
  p_initial_rate_percent numeric,
  p_loan_number text default null,
  p_assessed_value_paise bigint default null,
  p_is_migrated boolean default false
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
    -- Manual / migrated number. Sequence untouched.
    v_loan_number := btrim(p_loan_number);
  end if;

  insert into loans (
    shop_id, loan_number, customer_id, principal_paise,
    pledge_item_description, pledge_weight_grams, loan_date, assessed_value_paise, is_migrated
  ) values (
    v_shop_id, v_loan_number, p_customer_id, p_principal_paise,
    p_pledge_item_description, p_pledge_weight_grams, p_loan_date, p_assessed_value_paise, p_is_migrated
  )
  returning id into v_loan_id;

  insert into interest_rate_segments (loan_id, rate_percent, effective_from, effective_to)
  values (v_loan_id, p_initial_rate_percent, p_loan_date, null);

  return v_loan_id;
end;
$$;

revoke all on function create_loan(uuid, bigint, text, numeric, date, numeric, text, bigint, boolean) from public;
grant execute on function create_loan(uuid, bigint, text, numeric, date, numeric, text, bigint, boolean) to authenticated;

-- Settings write. shops only has a SELECT policy, so updates go through this
-- security-definer RPC (gated by shop access) instead of a broad update policy.
create or replace function update_shop_settings(
  p_shop_id uuid,
  p_migration_mode_enabled boolean,
  p_next_loan_sequence integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_shop_access(p_shop_id) then
    raise exception 'not authorized for this shop';
  end if;
  if p_next_loan_sequence < 1 then
    raise exception 'next_loan_sequence must be >= 1';
  end if;

  update shops
    set migration_mode_enabled = p_migration_mode_enabled,
        next_loan_sequence = p_next_loan_sequence
  where id = p_shop_id;
end;
$$;

revoke all on function update_shop_settings(uuid, boolean, integer) from public;
grant execute on function update_shop_settings(uuid, boolean, integer) to authenticated;
