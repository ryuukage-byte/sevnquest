-- ============================================================================
-- Monetisasi fase 1 (docs/prd/PRD_MONETISASI.md): tier akses, donatur, lifetime, pembayaran QRIS statis
-- dengan verifikasi manual oleh admin.
--
-- Semua penulisan dilakukan lewat RPC SECURITY DEFINER. Klien hanya boleh membaca baris miliknya sendiri.
-- File ini idempoten; aman dijalankan ulang.
-- Admin TIDAK diisi di sini (tidak meng-hardcode id). Tambahkan dengan:
--   insert into public.admins (user_id) values ('<uuid>') on conflict do nothing;
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Katalog tier dan harga
-- ---------------------------------------------------------------------------
create table if not exists public.subscription_tiers (
  tier_code  text primary key,
  type       text not null check (type in ('access', 'donor', 'lifetime')),
  level      int  not null,
  name       text not null,
  title      text,
  benefits   jsonb not null default '[]'::jsonb,
  active     boolean not null default true
);
comment on table public.subscription_tiers is 'Katalog tier akses (basic/medium/full), donatur (d1-d7), dan lifetime.';

create table if not exists public.subscription_prices (
  tier_code     text not null references public.subscription_tiers (tier_code) on delete cascade,
  period_months int  not null check (period_months >= 0), -- 0 = sekali bayar (lifetime)
  price_idr     int  not null check (price_idr > 0),
  primary key (tier_code, period_months)
);

insert into public.subscription_tiers (tier_code, type, level, name, title, benefits) values
  ('basic',    'access',   1, 'Basic',  null, '["Kana sampai N5","Recall harian","Arcade & Dungeon N5","Leaderboard"]'),
  ('medium',   'access',   2, 'Medium', null, '["+ N4 dan N3","Tower lantai 61-100","Latihan Ekstra Recall tanpa batas","Tryout N4-N3"]'),
  ('full',     'access',   3, 'Full',   null, '["+ N2, N1, Kaigo, SSW","Semua tryout","Deck AI","Imersi YouTube"]'),
  ('d1',       'donor',    1, 'D1', 'Sakura', '["Badge donatur","Nama di papan donatur"]'),
  ('d2',       'donor',    2, 'D2', 'Ume',    '["+ Frame avatar khusus"]'),
  ('d3',       'donor',    3, 'D3', 'Take',   '["+ Voting topik konten"]'),
  ('d4',       'donor',    4, 'D4', 'Matsu',  '["+ Nama di halaman utama"]'),
  ('d5',       'donor',    5, 'D5', 'Tsuki',  '["+ Prioritas request konten"]'),
  ('d6',       'donor',    6, 'D6', 'Taiyou', '["+ Sesi feedback 1-on-1 per bulan"]'),
  ('d7',       'donor',    7, 'D7', 'Fuji',   '["+ Nama di kredit app"]'),
  ('lifetime', 'lifetime', 3, 'Lifetime', 'Eien', '["Akses Full selamanya","Title permanen Eien","Papan donatur bagian Lifetime"]')
on conflict (tier_code) do update set
  type = excluded.type, level = excluded.level, name = excluded.name, title = excluded.title, benefits = excluded.benefits;

insert into public.subscription_prices (tier_code, period_months, price_idr) values
  ('medium', 1, 15000), ('medium', 3, 42000), ('medium', 12, 150000),
  ('full',   1, 35000), ('full',   3, 99000), ('full',   12, 350000),
  ('d1', 1, 25000), ('d2', 1, 50000), ('d3', 1, 75000), ('d4', 1, 100000),
  ('d5', 1, 150000), ('d6', 1, 250000), ('d7', 1, 500000),
  ('lifetime', 0, 700000)
on conflict (tier_code, period_months) do update set price_idr = excluded.price_idr;

alter table public.subscription_tiers enable row level security;
alter table public.subscription_prices enable row level security;
drop policy if exists subscription_tiers_read on public.subscription_tiers;
create policy subscription_tiers_read on public.subscription_tiers for select to anon, authenticated using (true);
drop policy if exists subscription_prices_read on public.subscription_prices;
create policy subscription_prices_read on public.subscription_prices for select to anon, authenticated using (true);
revoke all on public.subscription_tiers, public.subscription_prices from anon, authenticated;
grant select on public.subscription_tiers, public.subscription_prices to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Admin
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security; -- tanpa policy: tidak terbaca klien
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- 3. Pesanan pembayaran
-- ---------------------------------------------------------------------------
create table if not exists public.payment_orders (
  id               uuid primary key default gen_random_uuid(),
  order_code       text not null unique,
  user_id          uuid not null references auth.users (id) on delete cascade,
  tier_code        text not null references public.subscription_tiers (tier_code),
  period_months    int  not null,
  base_price_idr   int  not null,
  unique_code      int  not null,
  amount_idr       int  not null,
  status           text not null default 'pending'
                   check (status in ('pending', 'claimed', 'paid', 'rejected', 'expired', 'cancelled')),
  paid_at_reported timestamptz,
  proof_path       text,
  reject_reason    text,
  verified_by      uuid references auth.users (id),
  verified_at      timestamptz,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default now() + interval '24 hours'
);
create index if not exists payment_orders_user_idx on public.payment_orders (user_id, created_at desc);
create index if not exists payment_orders_status_idx on public.payment_orders (status, created_at);

alter table public.payment_orders enable row level security;
drop policy if exists payment_orders_select_own on public.payment_orders;
create policy payment_orders_select_own on public.payment_orders for select to authenticated using (auth.uid() = user_id);
revoke all on public.payment_orders from anon, authenticated;
grant select on public.payment_orders to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Langganan aktif
-- ---------------------------------------------------------------------------
create table if not exists public.user_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  tier_code       text not null references public.subscription_tiers (tier_code),
  starts_at       timestamptz not null default now(),
  expires_at      timestamptz,            -- null = tidak pernah kedaluwarsa (lifetime)
  source_order_id uuid references public.payment_orders (id),
  created_at      timestamptz not null default now()
);
create index if not exists user_subscriptions_user_idx on public.user_subscriptions (user_id, tier_code, expires_at);

alter table public.user_subscriptions enable row level security;
drop policy if exists user_subscriptions_select_own on public.user_subscriptions;
create policy user_subscriptions_select_own on public.user_subscriptions for select to authenticated using (auth.uid() = user_id);
revoke all on public.user_subscriptions from anon, authenticated;
grant select on public.user_subscriptions to authenticated;

-- Preferensi tampil di papan donatur.
create table if not exists public.donor_preferences (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  anonymous boolean not null default false
);
alter table public.donor_preferences enable row level security;
revoke all on public.donor_preferences from anon, authenticated;

-- Kuota harian fitur AI (Deck AI). Diisi lewat consume_ai_quota.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  count   int  not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Entitlement
-- Masa tenggang 3 hari setelah expires_at tetap dihitung aktif (in_grace = true).
-- ---------------------------------------------------------------------------
create or replace function public.entitlement_for(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_grace interval := interval '3 days';
  v_lifetime boolean;
  v_access text := 'basic';
  v_access_exp timestamptz;
  v_donor int := 0;
  v_donor_exp timestamptz;
  v_donor_title text;
begin
  select exists (
    select 1 from user_subscriptions where user_id = p_user and tier_code = 'lifetime' and expires_at is null
  ) into v_lifetime;

  select t.tier_code, s.max_exp into v_access, v_access_exp
  from (
    select tier_code, max(expires_at) as max_exp
    from user_subscriptions
    -- Perpanjangan berurutan (starts_at = akhir langganan sebelumnya), jadi max(expires_at) = akhir masa aktif.
    where user_id = p_user and tier_code in ('medium', 'full') and expires_at + v_grace > now()
    group by tier_code
  ) s join subscription_tiers t on t.tier_code = s.tier_code
  order by t.level desc limit 1;
  v_access := coalesce(v_access, 'basic');
  if v_lifetime then v_access := 'full'; v_access_exp := null; end if;

  select t.level, s.max_exp, t.title into v_donor, v_donor_exp, v_donor_title
  from (
    select tier_code, max(expires_at) as max_exp
    from user_subscriptions
    where user_id = p_user and tier_code like 'd_' and expires_at + v_grace > now()
    group by tier_code
  ) s join subscription_tiers t on t.tier_code = s.tier_code
  order by t.level desc limit 1;

  return jsonb_build_object(
    'access_tier', v_access,
    'access_expires_at', v_access_exp,
    'access_in_grace', v_access_exp is not null and v_access_exp < now(),
    'is_lifetime', v_lifetime,
    'donor_level', coalesce(v_donor, 0),
    'donor_title', v_donor_title,
    'donor_expires_at', v_donor_exp,
    'donor_in_grace', v_donor_exp is not null and v_donor_exp < now(),
    'lifetime_title', case when v_lifetime then (select title from subscription_tiers where tier_code = 'lifetime') end,
    'is_admin', exists (select 1 from admins where user_id = p_user)
  );
end;
$$;
revoke all on function public.entitlement_for(uuid) from public, anon, authenticated;

create or replace function public.get_my_entitlement() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('access_tier', 'basic', 'is_lifetime', false, 'donor_level', 0, 'is_admin', false);
  end if;
  return entitlement_for(auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Alur pesanan (pengguna)
-- ---------------------------------------------------------------------------
create or replace function public.expire_stale_orders() returns void
language sql security definer set search_path = public as $$
  update payment_orders set status = 'expired' where status = 'pending' and expires_at < now();
$$;
revoke all on function public.expire_stale_orders() from public, anon, authenticated;

create or replace function public.create_payment_order(p_tier_code text, p_period_months int)
returns public.payment_orders
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_price int;
  v_type text;
  v_code int;
  v_order payment_orders;
  v_ent jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  perform expire_stale_orders();

  select p.price_idr, t.type into v_price, v_type
  from subscription_prices p join subscription_tiers t on t.tier_code = p.tier_code
  where p.tier_code = p_tier_code and p.period_months = p_period_months and t.active;
  if v_price is null then raise exception 'invalid_plan'; end if;

  if v_type = 'donor' then
    v_ent := entitlement_for(v_uid);
    if v_ent->>'access_tier' = 'basic' then raise exception 'donor_requires_access'; end if;
  end if;

  if (select count(*) from payment_orders where user_id = v_uid and status = 'pending') >= 3 then
    raise exception 'too_many_pending';
  end if;

  -- Kode unik 1-99 (lalu 100-999) yang belum dipakai order terbuka dengan harga dasar sama.
  select c into v_code from generate_series(1, 999) c
  where not exists (
    select 1 from payment_orders o
    where o.base_price_idr = v_price and o.unique_code = c and o.status in ('pending', 'claimed')
  )
  order by c limit 1;
  if v_code is null then raise exception 'no_unique_code'; end if;

  insert into payment_orders (order_code, user_id, tier_code, period_months, base_price_idr, unique_code, amount_idr)
  values (
    'SQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
    v_uid, p_tier_code, p_period_months, v_price, v_code, v_price - v_code
  )
  returning * into v_order;
  return v_order;
end;
$$;

create or replace function public.submit_payment_claim(p_order_id uuid, p_paid_at timestamptz, p_proof_path text default null)
returns public.payment_orders
language plpgsql security definer set search_path = public as $$
declare
  v_order payment_orders;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_proof_path is not null and p_proof_path not like auth.uid()::text || '/%' then
    raise exception 'invalid_proof_path';
  end if;
  update payment_orders
     set status = 'claimed',
         paid_at_reported = coalesce(p_paid_at, now()),
         proof_path = coalesce(p_proof_path, proof_path)
   where id = p_order_id and user_id = auth.uid() and status in ('pending', 'claimed', 'expired')
  returning * into v_order;
  if v_order.id is null then raise exception 'order_not_claimable'; end if;
  return v_order;
end;
$$;

create or replace function public.cancel_payment_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update payment_orders set status = 'cancelled'
   where id = p_order_id and user_id = auth.uid() and status = 'pending';
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Admin
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_orders(p_statuses text[] default array['claimed', 'pending'])
returns table (
  id uuid, order_code text, user_id uuid, user_email text, player_name text,
  tier_code text, period_months int, base_price_idr int, unique_code int, amount_idr int,
  status text, paid_at_reported timestamptz, proof_path text, reject_reason text,
  verified_at timestamptz, created_at timestamptz, expires_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  perform expire_stale_orders();
  return query
    select o.id, o.order_code, o.user_id, u.email::text, l.player_name,
           o.tier_code, o.period_months, o.base_price_idr, o.unique_code, o.amount_idr,
           o.status, o.paid_at_reported, o.proof_path, o.reject_reason,
           o.verified_at, o.created_at, o.expires_at
      from payment_orders o
      join auth.users u on u.id = o.user_id
      left join leaderboard l on l.user_id = o.user_id::text
     where o.status = any (p_statuses)
     order by (o.status = 'claimed') desc, o.amount_idr, o.created_at
     limit 500;
end;
$$;

create or replace function public.approve_payment(p_order_id uuid) returns public.payment_orders
language plpgsql security definer set search_path = public as $$
declare
  v_order payment_orders;
  v_start timestamptz;
begin
  if not is_admin() then raise exception 'forbidden'; end if;

  select * into v_order from payment_orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'order_not_found'; end if;
  if v_order.status not in ('pending', 'claimed', 'expired', 'rejected') then raise exception 'order_not_approvable'; end if;

  if v_order.period_months = 0 then
    insert into user_subscriptions (user_id, tier_code, starts_at, expires_at, source_order_id)
    values (v_order.user_id, v_order.tier_code, now(), null, v_order.id);
  else
    -- Perpanjang: mulai dari akhir langganan tier yang sama yang masih aktif, bukan menimpa.
    select greatest(now(), coalesce(max(expires_at), now())) into v_start
      from user_subscriptions
     where user_id = v_order.user_id and tier_code = v_order.tier_code and expires_at > now();
    insert into user_subscriptions (user_id, tier_code, starts_at, expires_at, source_order_id)
    values (v_order.user_id, v_order.tier_code, v_start, v_start + make_interval(months => v_order.period_months), v_order.id);
  end if;

  update payment_orders
     set status = 'paid', verified_by = auth.uid(), verified_at = now(), reject_reason = null
   where id = p_order_id
  returning * into v_order;
  return v_order;
end;
$$;

create or replace function public.reject_payment(p_order_id uuid, p_reason text) returns public.payment_orders
language plpgsql security definer set search_path = public as $$
declare
  v_order payment_orders;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update payment_orders
     set status = 'rejected', reject_reason = left(coalesce(p_reason, ''), 300),
         verified_by = auth.uid(), verified_at = now()
   where id = p_order_id and status in ('pending', 'claimed', 'expired')
  returning * into v_order;
  if v_order.id is null then raise exception 'order_not_rejectable'; end if;
  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Papan donatur (hanya untuk pengguna login)
-- ---------------------------------------------------------------------------
create or replace function public.get_donor_board()
returns table (display_name text, is_anonymous boolean, donor_level int, donor_title text, is_lifetime boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  return query
    with donors as (
      select s.user_id from user_subscriptions s
       where s.tier_code = 'lifetime' or (s.tier_code like 'd_' and s.expires_at + interval '3 days' > now())
       group by s.user_id
    ), ent as (
      select d.user_id, entitlement_for(d.user_id) as e from donors d
    )
    select case when coalesce(p.anonymous, false) then null else coalesce(l.player_name, 'Petualang') end,
           coalesce(p.anonymous, false),
           (e.e->>'donor_level')::int,
           e.e->>'donor_title',
           (e.e->>'is_lifetime')::boolean
      from ent e
      left join donor_preferences p on p.user_id = e.user_id
      left join leaderboard l on l.user_id = e.user_id::text
     order by (e.e->>'is_lifetime')::boolean desc, (e.e->>'donor_level')::int desc, l.player_name;
end;
$$;

create or replace function public.set_donor_anonymous(p_anonymous boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into donor_preferences (user_id, anonymous) values (auth.uid(), p_anonymous)
  on conflict (user_id) do update set anonymous = excluded.anonymous;
end;
$$;

create or replace function public.get_my_donor_preferences() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('anonymous', coalesce((select anonymous from donor_preferences where user_id = auth.uid()), false));
$$;

-- ---------------------------------------------------------------------------
-- 9. Kuota AI harian (dipanggil Cloudflare Function dengan JWT pengguna)
-- ---------------------------------------------------------------------------
create or replace function public.consume_ai_quota(p_limit int default 30) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Jakarta')::date;
  v_count int;
begin
  if v_uid is null then return jsonb_build_object('allowed', false, 'reason', 'not_authenticated'); end if;
  if entitlement_for(v_uid)->>'access_tier' <> 'full' then
    return jsonb_build_object('allowed', false, 'reason', 'tier');
  end if;
  insert into ai_usage (user_id, day, count) values (v_uid, v_day, 1)
  on conflict (user_id, day) do update set count = ai_usage.count + 1
  returning count into v_count;
  if v_count > least(greatest(p_limit, 1), 30) then
    return jsonb_build_object('allowed', false, 'reason', 'quota', 'used', v_count);
  end if;
  return jsonb_build_object('allowed', true, 'used', v_count);
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Hak eksekusi RPC
-- ---------------------------------------------------------------------------
revoke all on function public.is_admin() from public, anon;
revoke all on function public.get_my_entitlement() from public;
revoke all on function public.create_payment_order(text, int) from public, anon;
revoke all on function public.submit_payment_claim(uuid, timestamptz, text) from public, anon;
revoke all on function public.cancel_payment_order(uuid) from public, anon;
revoke all on function public.admin_list_orders(text[]) from public, anon;
revoke all on function public.approve_payment(uuid) from public, anon;
revoke all on function public.reject_payment(uuid, text) from public, anon;
revoke all on function public.get_donor_board() from public, anon;
revoke all on function public.set_donor_anonymous(boolean) from public, anon;
revoke all on function public.get_my_donor_preferences() from public, anon;
revoke all on function public.consume_ai_quota(int) from public, anon;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_my_entitlement() to anon, authenticated;
grant execute on function public.create_payment_order(text, int) to authenticated;
grant execute on function public.submit_payment_claim(uuid, timestamptz, text) to authenticated;
grant execute on function public.cancel_payment_order(uuid) to authenticated;
grant execute on function public.admin_list_orders(text[]) to authenticated;
grant execute on function public.approve_payment(uuid) to authenticated;
grant execute on function public.reject_payment(uuid, text) to authenticated;
grant execute on function public.get_donor_board() to authenticated;
grant execute on function public.set_donor_anonymous(boolean) to authenticated;
grant execute on function public.get_my_donor_preferences() to authenticated;
grant execute on function public.consume_ai_quota(int) to authenticated;

-- ---------------------------------------------------------------------------
-- 11. Storage: bukti bayar (privat). Path: <user_id>/<order_id>.<ext>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists payment_proofs_insert_own on storage.objects;
create policy payment_proofs_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists payment_proofs_update_own on storage.objects;
create policy payment_proofs_update_own on storage.objects for update to authenticated
  using (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists payment_proofs_select_own_or_admin on storage.objects;
create policy payment_proofs_select_own_or_admin on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
