-- Sivabalan Finance — Phase 1: loan fields (item type, remarks, issuer/receiver,
-- created/updated tracking) + loan edit audit history + edit_loan RPC.
-- Additive & backward-compatible. Apply after 0006_migration_mode.sql.

-- ---------------------------------------------------------------------------
-- New loan columns
-- ---------------------------------------------------------------------------
alter table loans
  add column if not exists item_type text not null default 'gold' check (item_type in ('gold', 'silver')),
  add column if not exists remarks text,
  add column if not exists issued_by uuid references auth.users(id),
  add column if not exists received_by uuid references auth.users(id),
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists updated_by uuid references auth.users(id),
  add column if not exists updated_at timestamptz;

-- ---------------------------------------------------------------------------
-- Loan edit audit history — one row per edit, snapshotting the PREVIOUS values.
-- ---------------------------------------------------------------------------
create table if not exists loan_edit_history (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  edited_by uuid references auth.users(id),
  edited_at timestamptz not null default now(),
  previous jsonb not null
);

create index if not exists idx_loan_edit_history_loan on loan_edit_history(loan_id, edited_at desc);

alter table loan_edit_history enable row level security;

create policy "staff can access loan edit history via loan shop" on loan_edit_history
  for all using (
    exists (select 1 from loans l where l.id = loan_id and has_shop_access(l.shop_id))
  ) with check (
    exists (select 1 from loans l where l.id = loan_id and has_shop_access(l.shop_id))
  );

-- ---------------------------------------------------------------------------
-- create_loan — now captures item_type, remarks, issued_by, received_by, and
-- stamps created_by = auth.uid(). (Signature change → drop first.)
-- ---------------------------------------------------------------------------
drop function if exists create_loan(uuid, bigint, text, numeric, date, numeric, text, bigint, boolean);

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
  p_issued_by uuid default null,
  p_received_by uuid default null
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
    select next_loan_sequence into v_seq from shops where id = v_shop_id for update;
    update shops set next_loan_sequence = v_seq + 1 where id = v_shop_id;
    v_loan_number := 'SF-' || v_seq;
  else
    v_loan_number := btrim(p_loan_number);
  end if;

  insert into loans (
    shop_id, loan_number, customer_id, principal_paise,
    pledge_item_description, pledge_weight_grams, loan_date, assessed_value_paise,
    is_migrated, item_type, remarks, issued_by, received_by, created_by
  ) values (
    v_shop_id, v_loan_number, p_customer_id, p_principal_paise,
    p_pledge_item_description, p_pledge_weight_grams, p_loan_date, p_assessed_value_paise,
    p_is_migrated, coalesce(p_item_type, 'gold'), p_remarks, p_issued_by, p_received_by, auth.uid()
  )
  returning id into v_loan_id;

  insert into interest_rate_segments (loan_id, rate_percent, effective_from, effective_to)
  values (v_loan_id, p_initial_rate_percent, p_loan_date, null);

  return v_loan_id;
end;
$$;

revoke all on function create_loan(uuid, bigint, text, numeric, date, numeric, text, bigint, boolean, text, text, uuid, uuid) from public;
grant execute on function create_loan(uuid, bigint, text, numeric, date, numeric, text, bigint, boolean, text, text, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- edit_loan — updates editable loan fields + the open rate segment, stamps
-- updated_by/updated_at, and records the previous values in loan_edit_history.
-- Nulls mean "leave unchanged" for optional fields; core fields are required.
-- ---------------------------------------------------------------------------
create or replace function edit_loan(
  p_loan_id uuid,
  p_principal_paise bigint,
  p_pledge_item_description text,
  p_pledge_weight_grams numeric,
  p_item_type text,
  p_loan_date date,
  p_remarks text,
  p_rate_percent numeric,
  p_issued_by uuid,
  p_received_by uuid
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

  -- Current open rate segment (if any).
  select id, rate_percent into v_seg_id, v_old_rate
  from interest_rate_segments
  where loan_id = p_loan_id and effective_to is null
  order by effective_from desc
  limit 1;

  -- Snapshot the previous values before changing anything.
  insert into loan_edit_history (loan_id, edited_by, previous)
  values (
    p_loan_id,
    auth.uid(),
    jsonb_build_object(
      'principal_paise', v_loan.principal_paise,
      'pledge_item_description', v_loan.pledge_item_description,
      'pledge_weight_grams', v_loan.pledge_weight_grams,
      'item_type', v_loan.item_type,
      'loan_date', v_loan.loan_date,
      'remarks', v_loan.remarks,
      'rate_percent', v_old_rate,
      'issued_by', v_loan.issued_by,
      'received_by', v_loan.received_by
    )
  );

  update loans set
    principal_paise = p_principal_paise,
    pledge_item_description = p_pledge_item_description,
    pledge_weight_grams = p_pledge_weight_grams,
    item_type = coalesce(p_item_type, item_type),
    loan_date = p_loan_date,
    remarks = p_remarks,
    issued_by = p_issued_by,
    received_by = p_received_by,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_loan_id;

  -- Correct the open segment's rate in place if it changed.
  if v_seg_id is not null and p_rate_percent is not null and p_rate_percent <> v_old_rate then
    update interest_rate_segments set rate_percent = p_rate_percent where id = v_seg_id;
  end if;
end;
$$;

revoke all on function edit_loan(uuid, bigint, text, numeric, text, date, text, numeric, uuid, uuid) from public;
grant execute on function edit_loan(uuid, bigint, text, numeric, text, date, text, numeric, uuid, uuid) to authenticated;
