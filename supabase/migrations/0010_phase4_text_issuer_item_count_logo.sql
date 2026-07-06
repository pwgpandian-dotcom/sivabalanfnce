-- Sivabalan Finance — Phase 4.
-- 1. issued_by / received_by become FREE TEXT (were uuid → auth.users, which broke
--    create_loan whenever a typed name was sent). 2. item_count on loans. 3. shop
--    logo_url + storage bucket + set_shop_logo RPC. 4. delete_re_pledge RPC.
-- 5. create_loan / edit_loan refreshed to the new text + item_count signatures.
-- Additive & backward-compatible: existing rows keep their data (uuids cast to text,
-- item_count defaults to 1). Apply after 0009_interest_roundup.sql.

-- ---------------------------------------------------------------------------
-- 1 + 2. Loan columns
-- ---------------------------------------------------------------------------
alter table loans
  add column if not exists item_count integer not null default 1 check (item_count >= 1);

-- Drop the auth.users foreign keys added in 0007, then widen to free text.
alter table loans drop constraint if exists loans_issued_by_fkey;
alter table loans drop constraint if exists loans_received_by_fkey;
alter table loans alter column issued_by type text using issued_by::text;
alter table loans alter column received_by type text using received_by::text;

-- ---------------------------------------------------------------------------
-- 3. Shop logo
-- ---------------------------------------------------------------------------
alter table shops add column if not exists logo_url text;

-- ---------------------------------------------------------------------------
-- 4. create_loan — issued_by/received_by now text, + item_count.
--    (Signature changed → drop the old 13-arg version first.)
-- ---------------------------------------------------------------------------
drop function if exists create_loan(uuid, bigint, text, numeric, date, numeric, text, bigint, boolean, text, text, uuid, uuid);

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
  p_item_count integer default 1
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
    is_migrated, item_type, remarks, issued_by, received_by, item_count, created_by
  ) values (
    v_shop_id, v_loan_number, p_customer_id, p_principal_paise,
    p_pledge_item_description, p_pledge_weight_grams, p_loan_date, p_assessed_value_paise,
    p_is_migrated, coalesce(p_item_type, 'gold'), p_remarks,
    nullif(btrim(coalesce(p_issued_by, '')), ''), nullif(btrim(coalesce(p_received_by, '')), ''),
    greatest(1, coalesce(p_item_count, 1)), auth.uid()
  )
  returning id into v_loan_id;

  insert into interest_rate_segments (loan_id, rate_percent, effective_from, effective_to)
  values (v_loan_id, p_initial_rate_percent, p_loan_date, null);

  return v_loan_id;
end;
$$;

revoke all on function create_loan(uuid, bigint, text, numeric, date, numeric, text, bigint, boolean, text, text, text, text, integer) from public;
grant execute on function create_loan(uuid, bigint, text, numeric, date, numeric, text, bigint, boolean, text, text, text, text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. edit_loan — issued_by/received_by now text, + item_count.
--    (Signature changed → drop the old 10-arg version first.)
-- ---------------------------------------------------------------------------
drop function if exists edit_loan(uuid, bigint, text, numeric, text, date, text, numeric, uuid, uuid);

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
  p_item_count integer
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
      'received_by', v_loan.received_by
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
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_loan_id;

  if v_seg_id is not null and p_rate_percent is not null and p_rate_percent <> v_old_rate then
    update interest_rate_segments set rate_percent = p_rate_percent where id = v_seg_id;
  end if;
end;
$$;

revoke all on function edit_loan(uuid, bigint, text, numeric, text, date, text, numeric, text, text, integer) from public;
grant execute on function edit_loan(uuid, bigint, text, numeric, text, date, text, numeric, text, text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. delete_re_pledge — remove a re-pledge (history cascades via FK).
-- ---------------------------------------------------------------------------
create or replace function delete_re_pledge(p_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop_id uuid;
begin
  select l.shop_id into v_shop_id
  from re_pledges rp join loans l on l.id = rp.loan_id
  where rp.id = p_id;
  if v_shop_id is null then
    raise exception 're-pledge % not found', p_id;
  end if;
  if not has_shop_access(v_shop_id) then
    raise exception 'not authorized for this shop';
  end if;

  delete from re_pledges where id = p_id;
end;
$$;

revoke all on function delete_re_pledge(uuid) from public;
grant execute on function delete_re_pledge(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. set_shop_logo — save the uploaded logo's public URL onto the shop.
-- ---------------------------------------------------------------------------
create or replace function set_shop_logo(p_shop_id uuid, p_logo_url text) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_shop_access(p_shop_id) then
    raise exception 'not authorized for this shop';
  end if;
  update shops set logo_url = p_logo_url where id = p_shop_id;
end;
$$;

revoke all on function set_shop_logo(uuid, text) from public;
grant execute on function set_shop_logo(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Storage bucket for shop logos (public read) + authenticated write policies.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('shop-logos', 'shop-logos', true)
on conflict (id) do update set public = true;

drop policy if exists "shop logos public read" on storage.objects;
create policy "shop logos public read" on storage.objects
  for select using (bucket_id = 'shop-logos');

drop policy if exists "shop logos auth insert" on storage.objects;
create policy "shop logos auth insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'shop-logos');

drop policy if exists "shop logos auth update" on storage.objects;
create policy "shop logos auth update" on storage.objects
  for update to authenticated using (bucket_id = 'shop-logos') with check (bucket_id = 'shop-logos');
