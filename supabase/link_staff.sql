-- Run this in Supabase Dashboard -> SQL Editor AFTER creating the staff user
-- (Authentication -> Users -> Add User, with "Auto Confirm User" checked).
--
-- Just replace the email below with the user's email. No UUID copying needed —
-- it looks the user up automatically and links them as 'admin' to the shop.

do $$
declare
  v_email text := 'sfkarur2026@gmail.com';  -- <-- put the new user's email here
  v_user_id uuid;
  v_shop_id uuid;
begin
  -- find the auth user by email
  select id into v_user_id from auth.users where email = v_email;
  if v_user_id is null then
    raise exception 'No auth user found for email %. Create it in Authentication -> Users first.', v_email;
  end if;

  -- create the shop once (reuse if it already exists)
  select id into v_shop_id from shops where name = 'Sivabalan Finance';
  if v_shop_id is null then
    insert into shops (name) values ('Sivabalan Finance') returning id into v_shop_id;
  end if;

  -- link user -> shop as admin (idempotent)
  insert into staff_shop_roles (user_id, shop_id, role)
  values (v_user_id, v_shop_id, 'admin')
  on conflict (user_id, shop_id) do update set role = 'admin';

  raise notice 'Linked % (user %) to shop % as admin.', v_email, v_user_id, v_shop_id;
end $$;
