-- Alur Toko: pemberian pass, drip tahunan/Lifetime, beli pass, buka pack, retired, admin, RLS. Jalankan lewat run_local.sh.
\set ON_ERROR_STOP 1
begin;
insert into auth.users (id) values
 ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b'),
 ('00000000-0000-0000-0000-00000000000c'),('00000000-0000-0000-0000-00000000000d'),('00000000-0000-0000-0000-0000000000ad');
insert into admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');

create or replace function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, true) $$;
create or replace function pg_temp.bal(u text) returns int language sql as $$ select coalesce((select balance from pass_wallets where user_id = u::uuid), 0) $$;
create or replace function pg_temp.check(c boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(c,false) then raise exception 'CHECK FAILED: %', msg; end if; raise notice 'ok: %', msg; end $$;
create or replace function pg_temp.expect_err(q text, code text) returns void language plpgsql as $$
begin execute q; raise exception 'CHECK FAILED: expected % from %', code, q;
exception when others then if sqlerrm <> code then raise; end if; raise notice 'ok: % -> %', q, code; end $$;
create or replace function pg_temp.order_and_approve(u text, kind text, amt int) returns uuid language plpgsql as $$
declare o payment_orders;
begin perform pg_temp.as_user(u); o := create_payment_order(kind, amt, false);
  perform pg_temp.as_user('00000000-0000-0000-0000-0000000000ad'); perform approve_payment(o.id, null); return o.id; end $$;

-- 1. bulanan
select pg_temp.order_and_approve('00000000-0000-0000-0000-00000000000a', 'monthly', 17000);
select pg_temp.check(pg_temp.bal('00000000-0000-0000-0000-00000000000a') = 3, 'monthly donation grants 3');
select pg_temp.order_and_approve('00000000-0000-0000-0000-00000000000a', 'monthly', 10000);
select pg_temp.check(pg_temp.bal('00000000-0000-0000-0000-00000000000a') = 3, 'second monthly donation same month: no extra');

-- 2. tahunan + drip
select pg_temp.order_and_approve('00000000-0000-0000-0000-00000000000b', 'yearly', 102000);
select pg_temp.check(pg_temp.bal('00000000-0000-0000-0000-00000000000b') = 3, 'yearly tranche 1 immediately');
update pass_drips set starts_at = now() - interval '65 days' where user_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((get_my_pass_state()->>'balance')::int = 9, 'after 65 days: 3 tranches = 9');
select pg_temp.check((get_my_pass_state()->>'balance')::int = 9, 'sync idempotent');
update pass_drips set starts_at = now() - interval '500 days' where user_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check((get_my_pass_state()->>'balance')::int = 36, 'yearly caps at 36');
select pg_temp.check(get_my_pass_state()->'next_grant_at' = 'null'::jsonb, 'no next grant after 12 tranches');

-- 3. beli pass
select pg_temp.order_and_approve('00000000-0000-0000-0000-00000000000a', 'pass', 14000);
select pg_temp.check(pg_temp.bal('00000000-0000-0000-0000-00000000000a') = 5, 'buy 2 passes');
select pg_temp.check((select count(*) from donations where order_id in (select id from payment_orders where tier_code='pass')) = 0, 'pass purchase is not a donation');
select pg_temp.check((select count(*) from access_keys where order_id in (select id from payment_orders where tier_code='pass')) = 0, 'no access key for pass order');
select pg_temp.check((select count(*) from letters where gift->>'kind' = 'pass') = 1, 'pass letter sent');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_err($$select create_payment_order('pass', 7000, false)$$, 'not_full');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_err($$select create_payment_order('pass', 7500, false)$$, 'invalid_amount');
select pg_temp.expect_err($$select create_payment_order('pass', 7000*21, false)$$, 'invalid_amount');
select pg_temp.expect_err($$select create_payment_order('pass', 7000, true)$$, 'pass_gift_not_supported');

-- 4. pack
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select admin_upsert_pack('{"id":"kilat-n3","title":"Kilat N3","level":"N3","price_passes":2,"status":"published"}',
  '{"id":"kilat-n3","chapters":[{"id":"c1","chapterNumber":1,"titleId":"Wajib","items":[{"id":"k1","category":"kotoba","addedAt":"x"},{"id":"k2","category":"kotoba","addedAt":"x"}]},{"id":"c2","chapterNumber":2,"titleId":"Sering","items":[{"id":"k2","category":"kotoba","addedAt":"x"},{"id":"k3","category":"kotoba","addedAt":"x"}]}]}');
select pg_temp.check((select item_count from packs where id='kilat-n3') = 3, 'item_count distinct = 3');
select pg_temp.check((select content_version from packs where id='kilat-n3') = 1, 'content_version 1');
select admin_upsert_pack('{"id":"kilat-n3"}', (select book from pack_contents where pack_id='kilat-n3'));
select pg_temp.check((select content_version from packs where id='kilat-n3') = 1, 'same book: version unchanged');
select admin_upsert_pack('{"id":"kilat-n3"}', jsonb_set((select book from pack_contents where pack_id='kilat-n3'), '{title}', '"v2"'));
select pg_temp.check((select content_version from packs where id='kilat-n3') = 2, 'changed book: version 2');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check(jsonb_array_length(get_store_catalog()->'packs') = 1, 'catalog lists pack');
select pg_temp.check((get_store_catalog()->'packs'->0->>'owned')::boolean = false, 'not owned yet');
select pg_temp.expect_err($$select get_pack_contents('kilat-n3')$$, 'not_owned');
select pg_temp.check((unlock_pack('kilat-n3')->'pass'->>'balance')::int = 3, 'unlock costs 2 (5->3)');
select pg_temp.check(get_pack_contents('kilat-n3')->>'content_version' = '2', 'owner reads contents');
select pg_temp.expect_err($$select unlock_pack('kilat-n3')$$, 'already_owned');
select pg_temp.check(pg_temp.bal('00000000-0000-0000-0000-00000000000a') = 3, 'double unlock did not charge');
select pg_temp.check(jsonb_array_length(list_my_packs()) = 1, 'list_my_packs');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_err($$select unlock_pack('kilat-n3')$$, 'insufficient_passes');
select pg_temp.expect_err($$select unlock_pack('nope')$$, 'pack_not_available');

-- retired: tidak tampil untuk non-pemilik, tetap tampil untuk pemilik
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select admin_upsert_pack('{"id":"kilat-n3","status":"retired"}', null);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check(jsonb_array_length(get_store_catalog()->'packs') = 0, 'retired hidden for non-owner');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check(jsonb_array_length(get_store_catalog()->'packs') = 1, 'retired still listed for owner');
select pg_temp.check(get_pack_contents('kilat-n3') ? 'book', 'owner still reads retired pack');

-- 5. lifetime
select pg_temp.order_and_approve('00000000-0000-0000-0000-00000000000d', 'lifetime', 700000);
select pg_temp.check(pg_temp.bal('00000000-0000-0000-0000-00000000000d') = 3, 'lifetime unit: 3, lifetime drip not yet');
update pass_drips set starts_at = now() - interval '1 day' where user_id = '00000000-0000-0000-0000-00000000000d' and kind='lifetime';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.check((get_my_pass_state()->>'balance')::int = 6, 'lifetime drip tranche 1');

-- 6. admin grant & negatif
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
select admin_grant_passes('00000000-0000-0000-0000-00000000000c', 2, 'kompensasi');
select pg_temp.expect_err($$select admin_grant_passes('00000000-0000-0000-0000-00000000000c', -5, 'x')$$, 'insufficient_passes');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_err($$select admin_grant_passes('00000000-0000-0000-0000-00000000000c', 2, 'x')$$, 'forbidden');

-- 7. entitlement & invarian
select pg_temp.check((entitlement_for('00000000-0000-0000-0000-00000000000a')->>'pass_balance')::int = 3, 'entitlement has pass_balance');
select pg_temp.check(not exists (
  select 1 from pass_wallets w where w.balance <> (select coalesce(sum(delta),0) from pass_ledger l where l.user_id = w.user_id)
), 'balance = sum(ledger) for all wallets');

-- 8. RLS sebagai authenticated
set local role authenticated;
select pg_temp.check((select count(*) from pass_wallets) = 1, 'RLS: only own wallet visible');
select pg_temp.check((select count(*) from packs) = 0, 'RLS: retired pack not visible in table');
select pg_temp.expect_err($$select * from pack_contents$$, 'permission denied for table pack_contents');
select pg_temp.expect_err($$update pass_wallets set balance = 999$$, 'permission denied for table pass_wallets');
select pg_temp.expect_err($$select grant_passes_internal(auth.uid(), 100, 'admin')$$, 'permission denied for function grant_passes_internal');
reset role;
rollback;
