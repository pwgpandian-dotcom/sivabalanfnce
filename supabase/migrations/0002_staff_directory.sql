-- Sivabalan Finance — staff directory support (additive; safe to run on prod).
--
-- Adds a security-definer RPC so shop staff can see who else is on the shop.
-- auth.users is not readable by the anon/authenticated client, so this function
-- (owned by a superuser role) reads it on the caller's behalf, but only after
-- confirming the caller actually has access to the requested shop.
--
-- Apply in Supabase Dashboard -> SQL Editor (same way 0001_init.sql was applied).

create or replace function list_shop_staff(p_shop_id uuid)
returns table (
  user_id uuid,
  name text,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not has_shop_access(p_shop_id) then
    raise exception 'not authorized for this shop';
  end if;

  return query
    select
      ssr.user_id,
      coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '') as name,
      u.email::text as email,
      ssr.role,
      ssr.created_at
    from staff_shop_roles ssr
    join auth.users u on u.id = ssr.user_id
    where ssr.shop_id = p_shop_id
    order by ssr.created_at;
end;
$$;

revoke all on function list_shop_staff(uuid) from public;
grant execute on function list_shop_staff(uuid) to authenticated;
