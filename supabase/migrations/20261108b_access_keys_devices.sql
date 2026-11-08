-- ============================================================================
-- Key akses + batas perangkat (PRD v0.8).
--
-- Key akses: setiap pesanan donasi yang terverifikasi menghasilkan satu key unik (SQ-XXXX-XXXX-XXXX).
--   - Pesanan biasa: key langsung ditukarkan ke akun pembeli (pengalaman sama seperti sebelumnya).
--   - Pesanan hadiah (as_gift): key belum dipakai; bisa ditukar SEKALI oleh akun mana pun lewat redeem_access_key.
--   Isi key mengikuti sistem donasi: donasi bulanan (nominal) atau setoran lifetime (kelipatan Rp 25.000).
--
-- Batas perangkat: maksimal 3 perangkat aktif per akun (admin bebas). Angka batas sengaja tidak dikirim ke klien.
-- Idempoten.
-- ============================================================================

alter table public.payment_orders add column if not exists as_gift boolean not null default false;

create table if not exists public.access_keys (
  code        text primary key,
  order_id    uuid not null unique references public.payment_orders (id),
  kind        text not null check (kind in ('monthly', 'lifetime')),
  amount_idr  int  not null check (amount_idr > 0),
  created_at  timestamptz not null default now(),
  redeemed_by uuid references auth.users (id) on delete set null,
  redeemed_at timestamptz
);
alter table public.access_keys enable row level security;
revoke all on public.access_keys from anon, authenticated;

create table if not exists public.user_devices (
  user_id    uuid not null references auth.users (id) on delete cascade,
  device_id  text not null check (length(device_id) between 8 and 64),
  label      text,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  primary key (user_id, device_id)
);
alter table public.user_devices enable row level security;
revoke all on public.user_devices from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Donasi diterapkan ke sebuah akun (dipakai persetujuan pesanan dan penukaran key).
-- ---------------------------------------------------------------------------
create or replace function public.apply_donation_internal(p_user uuid, p_kind text, p_amount int, p_order uuid, p_month text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_cfg jsonb := donation_config();
  v_total int;
begin
  insert into donations (user_id, order_id, kind, amount_idr, month)
  values (p_user, p_order, p_kind, p_amount, p_month);

  if p_kind = 'monthly' then
    select coalesce(sum(amount_idr), 0) into v_total
      from donations where user_id = p_user and kind = 'monthly' and month = p_month;
    if v_total >= (v_cfg->>'monthly_threshold')::int
       and not exists (select 1 from monthly_grants where user_id = p_user and month = p_month) then
      insert into monthly_grants (user_id, month) values (p_user, p_month);
      perform grant_full_days(p_user, (v_cfg->>'full_days')::int, p_order);
    end if;
  else
    perform grant_full_days(p_user, (v_cfg->>'full_days')::int, p_order);
    select coalesce(sum(amount_idr), 0) into v_total from donations where user_id = p_user and kind = 'lifetime';
    if v_total >= (v_cfg->>'lifetime_target')::int
       and not exists (select 1 from user_subscriptions where user_id = p_user and tier_code = 'lifetime') then
      insert into user_subscriptions (user_id, tier_code, starts_at, expires_at, source_order_id)
      values (p_user, 'lifetime', now(), null, p_order);
    end if;
  end if;
end;
$$;
revoke all on function public.apply_donation_internal(uuid, text, int, uuid, text) from public, anon, authenticated;

create or replace function public.new_access_key_code() returns text
language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- tanpa I, L, O, 0, 1 (mudah tertukar)
  v_bytes bytea := extensions.gen_random_bytes(12);
  v_out text := '';
  i int;
begin
  for i in 0..11 loop
    v_out := v_out || substr(v_alphabet, (get_byte(v_bytes, i) % length(v_alphabet)) + 1, 1);
    if i in (3, 7) then v_out := v_out || '-'; end if;
  end loop;
  return 'SQ-' || v_out;
end;
$$;
revoke all on function public.new_access_key_code() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Persetujuan pesanan: buat key; pesanan biasa langsung ditukar ke pembeli.
-- ---------------------------------------------------------------------------
create or replace function public.approve_order_internal(p_order_id uuid, p_verifier uuid) returns public.payment_orders
language plpgsql security definer set search_path = public as $$
declare
  v_order payment_orders;
  v_kind text;
  v_code text;
  v_try int := 0;
begin
  select * into v_order from payment_orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'order_not_found'; end if;
  if v_order.status not in ('pending', 'claimed', 'expired', 'rejected') then raise exception 'order_not_approvable'; end if;
  if v_order.tier_code not in ('monthly', 'lifetime_unit') then raise exception 'legacy_plan_not_supported'; end if;

  v_kind := case when v_order.tier_code = 'monthly' then 'monthly' else 'lifetime' end;

  loop
    v_try := v_try + 1;
    v_code := new_access_key_code();
    begin
      insert into access_keys (code, order_id, kind, amount_idr) values (v_code, v_order.id, v_kind, v_order.base_price_idr);
      exit;
    exception when unique_violation then
      if v_try >= 10 then raise; end if;
    end;
  end loop;

  if not v_order.as_gift then
    -- Yang dikreditkan nominal dasar; potongan kode unik ditanggung SevnQuest.
    perform apply_donation_internal(v_order.user_id, v_kind, v_order.base_price_idr, v_order.id, wib_month(v_order.created_at));
    update access_keys set redeemed_by = v_order.user_id, redeemed_at = now() where code = v_code;
  end if;

  update payment_orders
     set status = 'paid', verified_by = p_verifier, verified_at = now(), reject_reason = null
   where id = p_order_id
  returning * into v_order;
  return v_order;
end;
$$;
revoke all on function public.approve_order_internal(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Pesanan: tambah opsi hadiah. Pembeli hadiah boleh sudah Lifetime / melewati target.
-- ---------------------------------------------------------------------------
drop function if exists public.create_payment_order(text, int);
create or replace function public.create_payment_order(p_kind text, p_amount int, p_as_gift boolean default false)
returns public.payment_orders
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_cfg jsonb := donation_config();
  v_tier text;
  v_code int;
  v_order payment_orders;
  v_life_total int;
  v_try int := 0;
  v_gift boolean := coalesce(p_as_gift, false);
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  perform expire_stale_orders();

  if p_kind = 'monthly' then
    v_tier := 'monthly';
    if p_amount is null or p_amount < (v_cfg->>'monthly_min')::int or p_amount > 10000000 then
      raise exception 'invalid_amount';
    end if;
  elsif p_kind = 'lifetime' then
    v_tier := 'lifetime_unit';
    if p_amount is null or p_amount < (v_cfg->>'lifetime_unit')::int or p_amount % (v_cfg->>'lifetime_unit')::int <> 0
       or p_amount > (v_cfg->>'lifetime_target')::int then
      raise exception 'invalid_amount';
    end if;
    if not v_gift then
      if exists (select 1 from user_subscriptions where user_id = v_uid and tier_code = 'lifetime') then
        raise exception 'already_lifetime';
      end if;
      select coalesce(sum(amount_idr), 0) into v_life_total from donations where user_id = v_uid and kind = 'lifetime';
      if v_life_total + p_amount > (v_cfg->>'lifetime_target')::int then
        raise exception 'exceeds_lifetime_target';
      end if;
    end if;
  else
    raise exception 'invalid_plan';
  end if;

  if (select count(*) from payment_orders where user_id = v_uid and status = 'pending') >= 3 then
    raise exception 'too_many_pending';
  end if;

  loop
    v_try := v_try + 1;
    select c into v_code from generate_series(1, least(999, p_amount / 10)) c
    where not exists (
      select 1 from payment_orders o
      where o.amount_idr = p_amount - c
        and (o.status in ('pending', 'claimed') or (o.status = 'expired' and o.created_at > now() - interval '48 hours'))
    )
    order by c limit 1;
    if v_code is null then raise exception 'no_unique_code'; end if;

    begin
      insert into payment_orders (order_code, user_id, tier_code, period_months, base_price_idr, unique_code, amount_idr, as_gift)
      values (
        'SQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
        v_uid, v_tier, 0, p_amount, v_code, p_amount - v_code, v_gift
      )
      returning * into v_order;
      return v_order;
    exception when unique_violation then
      if v_try >= 20 then raise exception 'no_unique_code'; end if;
    end;
  end loop;
end;
$$;
revoke all on function public.create_payment_order(text, int, boolean) from public, anon;
grant execute on function public.create_payment_order(text, int, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Tukar key (sekali pakai, satu akun).
-- ---------------------------------------------------------------------------
create or replace function public.redeem_access_key(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_cfg jsonb := donation_config();
  v_key access_keys;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_life_total int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  -- Normalisasi: terima "sq7kxmp2qd91af" atau "SQ-7KXM-P2QD-91AF".
  if v_code !~ '^SQ[A-Z0-9]{12}$' then raise exception 'key_invalid'; end if;
  v_code := 'SQ-' || substr(v_code, 3, 4) || '-' || substr(v_code, 7, 4) || '-' || substr(v_code, 11, 4);

  select * into v_key from access_keys where code = v_code for update;
  if v_key.code is null then raise exception 'key_invalid'; end if;
  if v_key.redeemed_by is not null then raise exception 'key_used'; end if;

  if v_key.kind = 'lifetime' then
    if exists (select 1 from user_subscriptions where user_id = v_uid and tier_code = 'lifetime') then
      raise exception 'already_lifetime';
    end if;
    select coalesce(sum(amount_idr), 0) into v_life_total from donations where user_id = v_uid and kind = 'lifetime';
    if v_life_total + v_key.amount_idr > (v_cfg->>'lifetime_target')::int then
      raise exception 'exceeds_lifetime_target';
    end if;
  end if;

  perform apply_donation_internal(v_uid, v_key.kind, v_key.amount_idr, v_key.order_id, wib_month(now()));
  update access_keys set redeemed_by = v_uid, redeemed_at = now() where code = v_code;
  return jsonb_build_object('code', v_code, 'kind', v_key.kind, 'amount_idr', v_key.amount_idr);
end;
$$;
revoke all on function public.redeem_access_key(text) from public, anon;
grant execute on function public.redeem_access_key(text) to authenticated;

-- Key milik pembeli (dari pesanannya) beserta status pakai; tidak membuka siapa penukarnya.
create or replace function public.list_my_access_keys()
returns table (code text, order_id uuid, kind text, amount_idr int, created_at timestamptz, as_gift boolean, redeemed boolean, redeemed_by_me boolean)
language sql stable security definer set search_path = public as $$
  select k.code, k.order_id, k.kind, k.amount_idr, k.created_at, o.as_gift, k.redeemed_by is not null, k.redeemed_by = auth.uid()
    from access_keys k join payment_orders o on o.id = k.order_id
   where o.user_id = auth.uid()
   order by k.created_at desc
   limit 50;
$$;
revoke all on function public.list_my_access_keys() from public, anon;
grant execute on function public.list_my_access_keys() to authenticated;

-- ---------------------------------------------------------------------------
-- Perangkat. Batas TIDAK dikembalikan ke klien.
-- ---------------------------------------------------------------------------
create or replace function public.register_device(p_device_id text, p_label text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_limit int := 3;
  v_allowed boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_device_id is null or length(p_device_id) not between 8 and 64 then raise exception 'invalid_device'; end if;

  if exists (select 1 from user_devices where user_id = v_uid and device_id = p_device_id) then
    update user_devices set last_seen = now(), label = coalesce(left(p_label, 80), label)
     where user_id = v_uid and device_id = p_device_id;
    v_allowed := true;
  elsif is_admin() or (select count(*) from user_devices where user_id = v_uid) < v_limit then
    insert into user_devices (user_id, device_id, label) values (v_uid, p_device_id, left(p_label, 80));
    v_allowed := true;
  else
    v_allowed := false;
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('device_id', d.device_id, 'label', d.label, 'last_seen', d.last_seen,
                                          'current', d.device_id = p_device_id) order by d.last_seen desc)
        from user_devices d where d.user_id = v_uid
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.register_device(text, text) from public, anon;
grant execute on function public.register_device(text, text) to authenticated;

create or replace function public.remove_device(p_device_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from user_devices where user_id = auth.uid() and device_id = p_device_id;
end;
$$;
revoke all on function public.remove_device(text) from public, anon;
grant execute on function public.remove_device(text) to authenticated;

-- Pesanan yang sudah lunas sebelum fitur key: beri key yang sudah tertukar ke pembelinya.
insert into public.access_keys (code, order_id, kind, amount_idr, redeemed_by, redeemed_at)
select public.new_access_key_code(), o.id,
       case when o.tier_code = 'monthly' then 'monthly' else 'lifetime' end,
       o.base_price_idr, o.user_id, coalesce(o.verified_at, now())
  from public.payment_orders o
 where o.status = 'paid' and o.tier_code in ('monthly', 'lifetime_unit')
   and not exists (select 1 from public.access_keys k where k.order_id = o.id)
on conflict do nothing;
