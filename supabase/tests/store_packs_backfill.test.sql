-- Backfill pengguna lama: tahunan 40 hari lalu -> 6 pass, bulanan bulan ini -> 3 pass; migrasi diulang tidak menggandakan.
\set ON_ERROR_STOP 1
begin;
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000e1'),('00000000-0000-0000-0000-0000000000e2'),('00000000-0000-0000-0000-0000000000ad');
insert into admins values ('00000000-0000-0000-0000-0000000000ad');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e1',true);
create temp table o1 as select (create_payment_order('yearly',102000,false)).id;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000e2',true);
create temp table o2 as select (create_payment_order('monthly',20000,false)).id;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000ad',true);
select approve_payment((select id from o1), null); select approve_payment((select id from o2), null);
-- simulasi "sebelum migrasi": hapus semua jejak pass, donasi tahunan 40 hari lalu
delete from pass_ledger; delete from pass_drips; delete from pass_wallets;
update donations set created_at = now() - interval '40 days' where kind='yearly';
\i ./supabase/migrations/20261127_store_packs.sql
\i ./supabase/migrations/20261127_store_packs.sql
do $$ begin
  if (select balance from pass_wallets where user_id = '00000000-0000-0000-0000-0000000000e1') <> 6 then raise exception 'CHECK FAILED: yearly backfill'; end if;
  if (select balance from pass_wallets where user_id = '00000000-0000-0000-0000-0000000000e2') <> 3 then raise exception 'CHECK FAILED: monthly backfill'; end if;
  raise notice 'ok: backfill tahunan 6 + bulanan 3, idempoten';
end $$;
rollback;
