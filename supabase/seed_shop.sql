-- One-time seed: run this AFTER 0001_init.sql has been applied, and AFTER you
-- have created one staff login in Supabase Dashboard -> Authentication -> Users -> Add User.
--
-- Steps:
--   1. Authentication -> Users -> Add User -> enter the staff email + password
--      (check "Auto Confirm User" so no email verification step is required).
--   2. Copy that user's UUID from the Users list.
--   3. Replace <STAFF_USER_ID> below with that UUID, and set the shop name.
--   4. Run this whole file in the SQL Editor.

insert into shops (name) values ('Sivabalan Finance')
returning id; -- note the returned shop id if you need it later

insert into staff_shop_roles (user_id, shop_id, role)
select '<STAFF_USER_ID>'::uuid, id, 'admin'
from shops
where name = 'Sivabalan Finance';
