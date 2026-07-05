-- Sivabalan Finance — Phase 2: Re-Pledge Management.
-- Additive & backward-compatible. Apply after 0007_loan_fields_audit.sql.
--
-- Extends the existing re_pledges table (keeps existing data), adds a pawn_brokers
-- master for the broker dropdown, a re-pledge edit/redeem history table, RPCs with
-- validations, and guards close_loan so a re-pledged loan can't be closed.

-- ---------------------------------------------------------------------------
-- Pawn brokers master (per shop)
-- ---------------------------------------------------------------------------
create table if not exists pawn_brokers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pawn_brokers_shop on pawn_brokers(shop_id, name);

alter table pawn_brokers enable row level security;

create policy "staff can access pawn_brokers in their shop" on pawn_brokers
  for all using (has_shop_access(shop_id)) with check (has_shop_access(shop_id));

-- ---------------------------------------------------------------------------
-- Extend re_pledges (broker FK, external tag, audit columns)
-- ---------------------------------------------------------------------------
alter table re_pledges
  add column if not exists pawn_broker_id uuid references pawn_brokers(id),
  add column if not exists external_tag_number text,
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists updated_by uuid references auth.users(id),
  add column if not exists updated_at timestamptz;

-- Receipt number must be unique per broker (only enforced when both are set).
create unique index if not exists uq_repledge_receipt_per_broker
  on re_pledges(pawn_broker_id, larger_broker_receipt_number)
  where pawn_broker_id is not null and larger_broker_receipt_number is not null;

-- ---------------------------------------------------------------------------
-- Re-pledge history (edit + redeem), snapshotting previous values
-- ---------------------------------------------------------------------------
create table if not exists re_pledge_history (
  id uuid primary key default gen_random_uuid(),
  re_pledge_id uuid not null references re_pledges(id) on delete cascade,
  action text not null check (action in ('edit', 'redeem')),
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now(),
  previous jsonb not null
);

create index if not exists idx_re_pledge_history on re_pledge_history(re_pledge_id, changed_at desc);

alter table re_pledge_history enable row level security;

create policy "staff can access re_pledge_history via loan shop" on re_pledge_history
  for all using (
    exists (
      select 1 from re_pledges rp join loans l on l.id = rp.loan_id
      where rp.id = re_pledge_id and has_shop_access(l.shop_id)
    )
  ) with check (
    exists (
      select 1 from re_pledges rp join loans l on l.id = rp.loan_id
      where rp.id = re_pledge_id and has_shop_access(l.shop_id)
    )
  );

-- ---------------------------------------------------------------------------
-- create_re_pledge — validates + inserts an active re-pledge.
-- ---------------------------------------------------------------------------
create or replace function create_re_pledge(
  p_loan_id uuid,
  p_pawn_broker_id uuid,
  p_receipt_number text,
  p_tag_number text,
  p_amount_paise bigint,
  p_pledge_date date,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan loans%rowtype;
  v_broker_name text;
  v_id uuid;
begin
  select * into v_loan from loans where id = p_loan_id;
  if not found then raise exception 'loan % not found', p_loan_id; end if;
  if not has_shop_access(v_loan.shop_id) then raise exception 'not authorized for this shop'; end if;

  if v_loan.status <> 'active' then
    raise exception 'only active loans can be re-pledged';
  end if;
  if exists (select 1 from re_pledges where loan_id = p_loan_id and status = 'active') then
    raise exception 'loan already has an active re-pledge';
  end if;
  if p_tag_number is null or btrim(p_tag_number) = '' then
    raise exception 'tag number is required';
  end if;

  select name into v_broker_name from pawn_brokers where id = p_pawn_broker_id and has_shop_access(shop_id);
  if v_broker_name is null then raise exception 'broker not found for this shop'; end if;

  insert into re_pledges (
    loan_id, pawn_broker_id, larger_broker_name, larger_broker_receipt_number,
    external_tag_number, amount_received_paise, pledge_date, notes, status,
    created_by, updated_by, updated_at
  ) values (
    p_loan_id, p_pawn_broker_id, v_broker_name, nullif(btrim(p_receipt_number), ''),
    btrim(p_tag_number), p_amount_paise, p_pledge_date, p_notes, 'active',
    auth.uid(), auth.uid(), now()
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- edit_re_pledge — updates an active re-pledge + snapshots previous to history.
-- ---------------------------------------------------------------------------
create or replace function edit_re_pledge(
  p_id uuid,
  p_pawn_broker_id uuid,
  p_receipt_number text,
  p_tag_number text,
  p_amount_paise bigint,
  p_pledge_date date,
  p_notes text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rp re_pledges%rowtype;
  v_shop_id uuid;
  v_broker_name text;
begin
  select * into v_rp from re_pledges where id = p_id;
  if not found then raise exception 're-pledge % not found', p_id; end if;
  select shop_id into v_shop_id from loans where id = v_rp.loan_id;
  if not has_shop_access(v_shop_id) then raise exception 'not authorized for this shop'; end if;
  if v_rp.status <> 'active' then raise exception 'only active re-pledges can be edited'; end if;
  if p_tag_number is null or btrim(p_tag_number) = '' then raise exception 'tag number is required'; end if;

  select name into v_broker_name from pawn_brokers where id = p_pawn_broker_id and has_shop_access(shop_id);
  if v_broker_name is null then raise exception 'broker not found for this shop'; end if;

  insert into re_pledge_history (re_pledge_id, action, changed_by, previous)
  values (p_id, 'edit', auth.uid(), jsonb_build_object(
    'pawn_broker_id', v_rp.pawn_broker_id, 'broker', v_rp.larger_broker_name,
    'receipt_number', v_rp.larger_broker_receipt_number, 'tag_number', v_rp.external_tag_number,
    'amount_paise', v_rp.amount_received_paise, 'pledge_date', v_rp.pledge_date, 'notes', v_rp.notes
  ));

  update re_pledges set
    pawn_broker_id = p_pawn_broker_id,
    larger_broker_name = v_broker_name,
    larger_broker_receipt_number = nullif(btrim(p_receipt_number), ''),
    external_tag_number = btrim(p_tag_number),
    amount_received_paise = p_amount_paise,
    pledge_date = p_pledge_date,
    notes = p_notes,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- redeem_re_pledge — marks redeemed + records redeem history.
-- ---------------------------------------------------------------------------
create or replace function redeem_re_pledge(
  p_id uuid,
  p_redeemed_date date
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rp re_pledges%rowtype;
  v_shop_id uuid;
begin
  select * into v_rp from re_pledges where id = p_id;
  if not found then raise exception 're-pledge % not found', p_id; end if;
  select shop_id into v_shop_id from loans where id = v_rp.loan_id;
  if not has_shop_access(v_shop_id) then raise exception 'not authorized for this shop'; end if;
  if v_rp.status <> 'active' then raise exception 're-pledge is not active'; end if;

  insert into re_pledge_history (re_pledge_id, action, changed_by, previous)
  values (p_id, 'redeem', auth.uid(), jsonb_build_object('status', v_rp.status, 'redeemed_date', v_rp.redeemed_date));

  update re_pledges set
    status = 'redeemed',
    redeemed_date = p_redeemed_date,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- close_loan — guard: a loan with an active re-pledge must be redeemed first.
-- (Recreated with the same signature + one extra check.)
-- ---------------------------------------------------------------------------
create or replace function close_loan(
  p_loan_id uuid,
  p_closed_date date,
  p_final_payment_amount_paise bigint,
  p_manual_interest_override_paise bigint default null,
  p_manual_principal_override_paise bigint default null
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

  perform record_payment(
    p_loan_id, p_closed_date, p_final_payment_amount_paise, 'full_closing',
    p_manual_interest_override_paise, p_manual_principal_override_paise
  );

  update interest_rate_segments set effective_to = p_closed_date
  where loan_id = p_loan_id and effective_to is null;

  update loans set status = 'closed', closed_date = p_closed_date where id = p_loan_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function create_re_pledge(uuid, uuid, text, text, bigint, date, text) from public;
revoke all on function edit_re_pledge(uuid, uuid, text, text, bigint, date, text) from public;
revoke all on function redeem_re_pledge(uuid, date) from public;
grant execute on function create_re_pledge(uuid, uuid, text, text, bigint, date, text) to authenticated;
grant execute on function edit_re_pledge(uuid, uuid, text, text, bigint, date, text) to authenticated;
grant execute on function redeem_re_pledge(uuid, date) to authenticated;
