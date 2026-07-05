-- Sivabalan Finance — initial schema
-- Money is always stored as integer paise (bigint). Never use float for currency.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Links an auth.users row to the shop(s) it may operate on.
-- Single-shop today (one row per staff member), but multi-shop just means
-- inserting more rows here — no schema change needed later.
create table staff_shop_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  role text not null default 'staff' check (role in ('staff', 'admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, shop_id)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  name text not null,
  phone text,
  address text,
  photo_url text,
  id_proof_url text,
  created_at timestamptz not null default now()
);

create table loans (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id),
  loan_number text not null,
  customer_id uuid not null references customers(id),
  principal_paise bigint not null check (principal_paise > 0),
  pledge_item_description text not null,
  pledge_weight_grams numeric,
  loan_date date not null,
  status text not null default 'active' check (status in ('active', 'closed')),
  closed_date date,
  created_at timestamptz not null default now(),
  unique (shop_id, loan_number)
);

create table interest_rate_segments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  rate_percent numeric not null check (rate_percent >= 0),
  effective_from date not null,
  effective_to date,
  created_at timestamptz not null default now()
);

-- manual_interest_override_paise / manual_principal_override_paise let staff
-- record a negotiated amount instead of the auto-calculated one. The
-- auto-calculated value is always stored alongside for audit purposes.
create table payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  payment_date date not null,
  amount_paise bigint not null check (amount_paise >= 0),
  payment_type text not null check (payment_type in ('interest', 'partial_principal', 'full_closing')),
  auto_calculated_interest_paise bigint,
  manual_interest_override_paise bigint,
  manual_principal_override_paise bigint,
  created_at timestamptz not null default now()
);

create index idx_customers_shop on customers(shop_id);
create index idx_loans_shop_status on loans(shop_id, status);
create index idx_loans_customer on loans(customer_id);
create index idx_segments_loan on interest_rate_segments(loan_id, effective_from);
create index idx_payments_loan_date on payments(loan_id, payment_date);

-- ---------------------------------------------------------------------------
-- Access helper
-- ---------------------------------------------------------------------------

create or replace function has_shop_access(p_shop_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from staff_shop_roles
    where user_id = auth.uid() and shop_id = p_shop_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table shops enable row level security;
alter table staff_shop_roles enable row level security;
alter table customers enable row level security;
alter table loans enable row level security;
alter table interest_rate_segments enable row level security;
alter table payments enable row level security;

create policy "staff can view their shops" on shops
  for select using (has_shop_access(id));

create policy "staff can view own role rows" on staff_shop_roles
  for select using (user_id = auth.uid());

create policy "staff can access customers in their shop" on customers
  for all using (has_shop_access(shop_id)) with check (has_shop_access(shop_id));

create policy "staff can access loans in their shop" on loans
  for all using (has_shop_access(shop_id)) with check (has_shop_access(shop_id));

create policy "staff can access segments via loan shop" on interest_rate_segments
  for all using (
    exists (select 1 from loans l where l.id = loan_id and has_shop_access(l.shop_id))
  ) with check (
    exists (select 1 from loans l where l.id = loan_id and has_shop_access(l.shop_id))
  );

create policy "staff can access payments via loan shop" on payments
  for all using (
    exists (select 1 from loans l where l.id = loan_id and has_shop_access(l.shop_id))
  ) with check (
    exists (select 1 from loans l where l.id = loan_id and has_shop_access(l.shop_id))
  );

-- ---------------------------------------------------------------------------
-- Interest calculation (core business rule)
-- ---------------------------------------------------------------------------

-- 30-day-cycle / half-month proration formula for a single rate segment.
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
  v_full_months integer;
  v_extra_days integer;
  v_interest_units numeric;
begin
  v_total_days := p_end_date - p_start_date;
  if v_total_days < 0 then
    raise exception 'end_date (%) must not be before start_date (%)', p_end_date, p_start_date;
  end if;

  v_full_months := floor(v_total_days / 30.0);
  v_extra_days := v_total_days - (v_full_months * 30);

  if v_extra_days = 0 then
    v_interest_units := v_full_months;
  elsif v_extra_days <= 10 then
    v_interest_units := v_full_months + 0.5;
  else
    v_interest_units := v_full_months + 1;
  end if;

  return round(p_principal_paise * (p_rate_percent / 100.0) * v_interest_units);
end;
$$;

-- Sums compute_period_interest() across every rate segment of a loan, up to
-- as_of_date. Manual overrides are NOT applied here — they are captured
-- per-payment (see record_payment) so the auto value stays available for audit.
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
    v_total := v_total + compute_period_interest(v_loan.principal_paise, v_seg.rate_percent, v_seg.effective_from, v_seg_end);
  end loop;

  return v_total;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC functions
-- ---------------------------------------------------------------------------

create or replace function create_loan(
  p_customer_id uuid,
  p_principal_paise bigint,
  p_pledge_item_description text,
  p_pledge_weight_grams numeric,
  p_loan_date date,
  p_initial_rate_percent numeric,
  p_loan_number text
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
    pledge_item_description, pledge_weight_grams, loan_date
  ) values (
    v_shop_id, p_loan_number, p_customer_id, p_principal_paise,
    p_pledge_item_description, p_pledge_weight_grams, p_loan_date
  )
  returning id into v_loan_id;

  insert into interest_rate_segments (loan_id, rate_percent, effective_from, effective_to)
  values (v_loan_id, p_initial_rate_percent, p_loan_date, null);

  return v_loan_id;
end;
$$;

create or replace function change_interest_rate(
  p_loan_id uuid,
  p_new_rate_percent numeric,
  p_effective_from date
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_current_segment_id uuid;
  v_current_from date;
  v_new_segment_id uuid;
begin
  select shop_id into v_shop_id from loans where id = p_loan_id;
  if v_shop_id is null then
    raise exception 'loan % not found', p_loan_id;
  end if;

  if not has_shop_access(v_shop_id) then
    raise exception 'not authorized for this shop';
  end if;

  select id, effective_from into v_current_segment_id, v_current_from
  from interest_rate_segments
  where loan_id = p_loan_id and effective_to is null
  order by effective_from desc
  limit 1;

  if v_current_segment_id is null then
    raise exception 'no open interest rate segment found for loan %', p_loan_id;
  end if;

  if p_effective_from <= v_current_from then
    raise exception 'effective_from (%) must be after current segment start (%)', p_effective_from, v_current_from;
  end if;

  update interest_rate_segments
  set effective_to = p_effective_from - 1
  where id = v_current_segment_id;

  insert into interest_rate_segments (loan_id, rate_percent, effective_from, effective_to)
  values (p_loan_id, p_new_rate_percent, p_effective_from, null)
  returning id into v_new_segment_id;

  return v_new_segment_id;
end;
$$;

create or replace function record_payment(
  p_loan_id uuid,
  p_payment_date date,
  p_amount_paise bigint,
  p_payment_type text,
  p_manual_interest_override_paise bigint default null,
  p_manual_principal_override_paise bigint default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
  v_status text;
  v_auto_interest bigint;
  v_payment_id uuid;
begin
  select shop_id, status into v_shop_id, v_status from loans where id = p_loan_id;
  if v_shop_id is null then
    raise exception 'loan % not found', p_loan_id;
  end if;

  if not has_shop_access(v_shop_id) then
    raise exception 'not authorized for this shop';
  end if;

  if v_status = 'closed' then
    raise exception 'loan % is already closed', p_loan_id;
  end if;

  if p_payment_type not in ('interest', 'partial_principal', 'full_closing') then
    raise exception 'invalid payment_type %', p_payment_type;
  end if;

  v_auto_interest := calculate_interest(p_loan_id, p_payment_date);

  insert into payments (
    loan_id, payment_date, amount_paise, payment_type,
    auto_calculated_interest_paise, manual_interest_override_paise, manual_principal_override_paise
  ) values (
    p_loan_id, p_payment_date, p_amount_paise, p_payment_type,
    v_auto_interest, p_manual_interest_override_paise, p_manual_principal_override_paise
  )
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;

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
  if v_shop_id is null then
    raise exception 'loan % not found', p_loan_id;
  end if;

  if not has_shop_access(v_shop_id) then
    raise exception 'not authorized for this shop';
  end if;

  if v_status = 'closed' then
    raise exception 'loan % is already closed', p_loan_id;
  end if;

  perform record_payment(
    p_loan_id, p_closed_date, p_final_payment_amount_paise, 'full_closing',
    p_manual_interest_override_paise, p_manual_principal_override_paise
  );

  update interest_rate_segments
  set effective_to = p_closed_date
  where loan_id = p_loan_id and effective_to is null;

  update loans
  set status = 'closed', closed_date = p_closed_date
  where id = p_loan_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants — only authenticated staff may call these RPCs
-- ---------------------------------------------------------------------------

revoke all on function create_loan from public;
revoke all on function change_interest_rate from public;
revoke all on function calculate_interest from public;
revoke all on function record_payment from public;
revoke all on function close_loan from public;

grant execute on function create_loan to authenticated;
grant execute on function change_interest_rate to authenticated;
grant execute on function calculate_interest to authenticated;
grant execute on function record_payment to authenticated;
grant execute on function close_loan to authenticated;
