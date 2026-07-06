-- Sivabalan Finance — Feature 4: re-pledge (re-hypothecation) tracking.
-- Additive. Apply in Supabase Dashboard -> SQL Editor after 0004_loan_sequence.sql.
--
-- Records when the shop re-pledges a customer's pledged item to a larger/wholesale
-- broker to raise funds. Staff need to see, at a glance, which broker holds an item
-- so they can redeem it first when a customer wants to close their loan urgently.

create table if not exists re_pledges (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  larger_broker_name text not null,
  larger_broker_receipt_number text,
  amount_received_paise bigint,
  interest_rate_percent numeric,
  pledge_date date not null,
  status text not null default 'active' check (status in ('active', 'redeemed')),
  redeemed_date date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_re_pledges_loan on re_pledges(loan_id, status);

-- Same shop-scoped access pattern as payments/segments (access via the loan's shop).
alter table re_pledges enable row level security;

drop policy if exists "staff can access re_pledges via loan shop" on re_pledges;
create policy "staff can access re_pledges via loan shop" on re_pledges
  for all using (
    exists (select 1 from loans l where l.id = loan_id and has_shop_access(l.shop_id))
  ) with check (
    exists (select 1 from loans l where l.id = loan_id and has_shop_access(l.shop_id))
  );
