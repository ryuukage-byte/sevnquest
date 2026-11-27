-- ============================================================================
-- Toko Pack & Pack Pass (docs/prd/PRD_TOKO_PACK.md).
--
--   * Pack = buku flashcard kurasi (bentuk OfficialBook). Metadata publik di `packs`; isinya di `pack_contents`
--     dan hanya keluar lewat get_pack_contents / unlock_pack untuk pemiliknya. Pack yang dibuka permanen.
--   * Pack Pass = saldo di `pass_wallets` (dikunci saat transaksi) dengan jejak di `pass_ledger`.
--     Sumber pass:
--       - donasi bulanan mencapai ambang (monthly_grants)  -> 3 pass, sekali per bulan WIB
--       - Paket Tahunan                                     -> drip 3 pass per 30 hari x 12 tahap (tahap 1 langsung)
--       - setoran lifetime (kelipatan Rp 25.000)            -> 3 pass per setoran
--       - status Lifetime (total Rp 700.000)                -> drip 3 pass per 30 hari tanpa batas (mulai 30 hari kemudian)
--       - beli pass tambahan (tier_code 'pass')             -> Rp 7.000 per pass, wajib akses Full aktif
--       - admin                                             -> admin_grant_passes
--   * Pass tidak pernah hangus. Pass boleh dipakai walau akses Full sudah habis; membeli pass wajib Full aktif.
--   * Pembelian pass BUKAN donasi: tidak masuk donations, total lifetime, badge, atau papan donatur.
-- Idempoten.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Konfigurasi
-- ---------------------------------------------------------------------------
create or replace function public.donation_config() returns jsonb
language sql immutable set search_path = public as $$
  select jsonb_build_object(
    'monthly_threshold', 17000,
    'monthly_min', 5000,
    'monthly_tiers', jsonb_build_array(17000, 25000, 35000, 50000, 75000, 100000, 150000),
    'lifetime_unit', 25000,
    'lifetime_target', 700000,
    'full_days', 30,
    'yearly_price', 102000,
    'yearly_days', 365,
    'pass_price_idr', 7000,
    'pass_max_per_order', 20,
    'pass_monthly', 3,
    'pass_yearly_tranche', 3,
    'pass_yearly_tranches', 12,
    'pass_lifetime_unit', 3,
    'pass_lifetime_drip', 3,
    'pass_drip_days', 30
  );
$$;

-- Tier teknis untuk pesanan pass (payment_orders.tier_code mereferensikan subscription_tiers). Tidak ditampilkan.
insert into public.subscription_tiers (tier_code, type, level, name, title, benefits, active)
values ('pass', 'donor', 0, 'Pack Pass', null, '["Rp 7.000 per pass"]'::jsonb, false)
on conflict (tier_code) do update set name = excluded.name, benefits = excluded.benefits, active = false;

alter table public.payment_orders add column if not exists quantity int;
alter table public.payment_orders drop constraint if exists payment_orders_quantity_check;
alter table public.payment_orders add constraint payment_orders_quantity_check check (quantity is null or quantity > 0);

-- ---------------------------------------------------------------------------
-- 2. Tabel
-- ---------------------------------------------------------------------------
create table if not exists public.packs (
  id              text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,47}$'),
  title           text not null,
  level           text not null,
  description     text not null default '',
  cover_icon      text not null default 'package',
  price_passes    int  not null check (price_passes between 1 and 20),
  item_count      int  not null default 0 check (item_count >= 0),
  chapter_summary jsonb not null default '[]'::jsonb,
  sources         jsonb not null default '[]'::jsonb,
  preview         jsonb not null default '[]'::jsonb,
  status          text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  sort_order      int  not null default 0,
  content_version int  not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.packs enable row level security;
revoke all on public.packs from anon, authenticated;
grant select on public.packs to authenticated;
drop policy if exists packs_read_published on public.packs;
create policy packs_read_published on public.packs for select to authenticated using (status = 'published');

create table if not exists public.pack_contents (
  pack_id         text primary key references public.packs (id) on delete cascade,
  book            jsonb not null,
  content_version int  not null default 1,
  updated_at      timestamptz not null default now()
);
alter table public.pack_contents enable row level security;
revoke all on public.pack_contents from anon, authenticated;

create table if not exists public.user_packs (
  user_id      uuid not null references auth.users (id) on delete cascade,
  pack_id      text not null references public.packs (id),
  unlocked_at  timestamptz not null default now(),
  passes_spent int  not null default 0 check (passes_spent >= 0),
  source       text not null default 'purchase' check (source in ('purchase', 'admin')),
  primary key (user_id, pack_id)
);
alter table public.user_packs enable row level security;
revoke all on public.user_packs from anon, authenticated;
grant select on public.user_packs to authenticated;
drop policy if exists user_packs_read_own on public.user_packs;
create policy user_packs_read_own on public.user_packs for select to authenticated using (user_id = auth.uid());

create table if not exists public.pass_wallets (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  balance    int  not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
alter table public.pass_wallets enable row level security;
revoke all on public.pass_wallets from anon, authenticated;
grant select on public.pass_wallets to authenticated;
drop policy if exists pass_wallets_read_own on public.pass_wallets;
create policy pass_wallets_read_own on public.pass_wallets for select to authenticated using (user_id = auth.uid());

create table if not exists public.pass_drips (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  kind               text not null check (kind in ('yearly', 'lifetime')),
  source_order_id    uuid references public.payment_orders (id),
  starts_at          timestamptz not null,
  interval_days      int not null default 30 check (interval_days > 0),
  passes_per_tranche int not null default 3 check (passes_per_tranche > 0),
  tranches_total     int check (tranches_total is null or tranches_total > 0), -- null = tanpa batas
  tranches_granted   int not null default 0 check (tranches_granted >= 0),
  created_at         timestamptz not null default now()
);
create unique index if not exists pass_drips_yearly_order_uidx on public.pass_drips (source_order_id) where kind = 'yearly';
create unique index if not exists pass_drips_lifetime_user_uidx on public.pass_drips (user_id) where kind = 'lifetime';
create index if not exists pass_drips_user_idx on public.pass_drips (user_id);
alter table public.pass_drips enable row level security;
revoke all on public.pass_drips from anon, authenticated;
grant select on public.pass_drips to authenticated;
drop policy if exists pass_drips_read_own on public.pass_drips;
create policy pass_drips_read_own on public.pass_drips for select to authenticated using (user_id = auth.uid());

create table if not exists public.pass_ledger (
  id         bigserial primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  delta      int  not null check (delta <> 0),
  reason     text not null check (reason in (
               'grant_monthly', 'grant_yearly', 'grant_lifetime_unit', 'grant_lifetime', 'purchase', 'spend', 'admin')),
  grant_key  text unique, -- kunci idempoten untuk pemberian (null untuk pemakaian/admin)
  order_id   uuid references public.payment_orders (id),
  pack_id    text references public.packs (id),
  drip_id    uuid references public.pass_drips (id) on delete set null,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists pass_ledger_user_idx on public.pass_ledger (user_id, created_at desc);
alter table public.pass_ledger enable row level security;
revoke all on public.pass_ledger from anon, authenticated;
grant select on public.pass_ledger to authenticated;
drop policy if exists pass_ledger_read_own on public.pass_ledger;
create policy pass_ledger_read_own on public.pass_ledger for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Helper internal
-- ---------------------------------------------------------------------------

-- Kunci dompet (buat bila belum ada). Semua perubahan saldo lewat sini agar tidak ada race.
create or replace function public.pass_wallet_lock(p_user uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_balance int;
begin
  insert into pass_wallets (user_id) values (p_user) on conflict (user_id) do nothing;
  select balance into v_balance from pass_wallets where user_id = p_user for update;
  return v_balance;
end;
$$;
revoke all on function public.pass_wallet_lock(uuid) from public, anon, authenticated;

-- Tambah/kurangi saldo + catat ledger. Dengan p_key: idempoten (kunci yang sama tidak diberikan dua kali).
-- Mengembalikan true bila saldo berubah.
create or replace function public.grant_passes_internal(
  p_user uuid, p_delta int, p_reason text, p_key text default null,
  p_order uuid default null, p_drip uuid default null, p_pack text default null, p_note text default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_balance int;
  v_id bigint;
begin
  if p_user is null or coalesce(p_delta, 0) = 0 then return false; end if;
  v_balance := pass_wallet_lock(p_user);
  if v_balance + p_delta < 0 then raise exception 'insufficient_passes'; end if;

  insert into pass_ledger (user_id, delta, reason, grant_key, order_id, drip_id, pack_id, note)
  values (p_user, p_delta, p_reason, p_key, p_order, p_drip, p_pack, p_note)
  on conflict (grant_key) do nothing
  returning id into v_id;
  if v_id is null then return false; end if;

  update pass_wallets set balance = balance + p_delta, updated_at = now() where user_id = p_user;
  return true;
end;
$$;
revoke all on function public.grant_passes_internal(uuid, int, text, text, uuid, uuid, text, text) from public, anon, authenticated;

-- Jumlah tahap drip yang sudah jatuh tempo pada p_at (tahap 1 jatuh tempo tepat di starts_at).
create or replace function public.pass_drip_due(p_starts timestamptz, p_interval_days int, p_total int, p_at timestamptz)
returns int
language sql immutable set search_path = public as $$
  select case
    when p_at < p_starts then 0
    else least(
      coalesce(p_total, 2147483647),
      floor(extract(epoch from (p_at - p_starts)) / (p_interval_days * 86400.0))::int + 1
    )
  end;
$$;

-- Berikan semua tahap drip yang sudah jatuh tempo. Idempoten.
create or replace function public.sync_pass_drips_internal(p_user uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_drip pass_drips;
  v_due int;
  v_n int;
  v_granted int := 0;
  v_reason text;
begin
  if p_user is null then return 0; end if;
  for v_drip in select * from pass_drips where user_id = p_user order by created_at for update loop
    v_due := pass_drip_due(v_drip.starts_at, v_drip.interval_days, v_drip.tranches_total, now());
    if v_due <= v_drip.tranches_granted then continue; end if;
    v_reason := case v_drip.kind when 'yearly' then 'grant_yearly' else 'grant_lifetime' end;
    for v_n in (v_drip.tranches_granted + 1)..v_due loop
      if grant_passes_internal(p_user, v_drip.passes_per_tranche, v_reason, 'drip:' || v_drip.id || ':' || v_n,
                               v_drip.source_order_id, v_drip.id, null, 'Tahap ' || v_n) then
        v_granted := v_granted + v_drip.passes_per_tranche;
      end if;
    end loop;
    update pass_drips set tranches_granted = v_due where id = v_drip.id;
  end loop;
  return v_granted;
end;
$$;
revoke all on function public.sync_pass_drips_internal(uuid) from public, anon, authenticated;

-- Akses Full aktif (bukan masa tenggang): syarat membeli pass.
create or replace function public.has_active_full(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_subscriptions where user_id = p_user and tier_code = 'lifetime' and expires_at is null)
      or exists (select 1 from user_subscriptions where user_id = p_user and tier_code in ('full', 'medium') and expires_at > now());
$$;
revoke all on function public.has_active_full(uuid) from public, anon, authenticated;

create or replace function public.pass_state_for(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_balance int;
  v_next timestamptz;
  v_next_amount int;
begin
  select coalesce((select balance from pass_wallets where user_id = p_user), 0) into v_balance;
  select d.starts_at + make_interval(days => d.interval_days * d.tranches_granted), d.passes_per_tranche
    into v_next, v_next_amount
    from pass_drips d
   where d.user_id = p_user and (d.tranches_total is null or d.tranches_granted < d.tranches_total)
   order by d.starts_at + make_interval(days => d.interval_days * d.tranches_granted)
   limit 1;
  return jsonb_build_object(
    'balance', v_balance,
    'next_grant_at', v_next,
    'next_grant_amount', v_next_amount,
    'can_buy', has_active_full(p_user),
    'price_idr', (donation_config()->>'pass_price_idr')::int,
    'max_per_order', (donation_config()->>'pass_max_per_order')::int
  );
end;
$$;
revoke all on function public.pass_state_for(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Pemberian pass dari donasi (definisi terbaru apply_donation_internal dari 20261119b + pass)
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
      perform grant_passes_internal(p_user, (v_cfg->>'pass_monthly')::int, 'grant_monthly',
                                    'monthly:' || p_user || ':' || p_month, p_order);
    end if;
  else
    if p_kind = 'yearly' then
      perform grant_full_days(p_user, (v_cfg->>'yearly_days')::int, p_order);
      insert into pass_drips (user_id, kind, source_order_id, starts_at, interval_days, passes_per_tranche, tranches_total)
      values (p_user, 'yearly', p_order, now(), (v_cfg->>'pass_drip_days')::int,
              (v_cfg->>'pass_yearly_tranche')::int, (v_cfg->>'pass_yearly_tranches')::int)
      on conflict do nothing;
    else
      perform grant_full_days(p_user, (v_cfg->>'full_days')::int, p_order);
      perform grant_passes_internal(p_user, (v_cfg->>'pass_lifetime_unit')::int, 'grant_lifetime_unit',
                                    'lifetime_unit:' || p_order, p_order);
    end if;
    v_total := lifetime_total_for(p_user);
    if v_total >= (v_cfg->>'lifetime_target')::int
       and not exists (select 1 from user_subscriptions where user_id = p_user and tier_code = 'lifetime') then
      insert into user_subscriptions (user_id, tier_code, starts_at, expires_at, source_order_id)
      values (p_user, 'lifetime', now(), null, p_order);
      -- Drip Lifetime mulai 30 hari lagi: bulan ini sudah tertutup oleh pass dari setoran/tahunan.
      insert into pass_drips (user_id, kind, source_order_id, starts_at, interval_days, passes_per_tranche, tranches_total)
      values (p_user, 'lifetime', p_order, now() + make_interval(days => (v_cfg->>'pass_drip_days')::int),
              (v_cfg->>'pass_drip_days')::int, (v_cfg->>'pass_lifetime_drip')::int, null)
      on conflict do nothing;
    end if;
  end if;

  perform sync_pass_drips_internal(p_user);
end;
$$;
revoke all on function public.apply_donation_internal(uuid, text, int, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Pesanan pass (definisi terbaru create_payment_order dari 20261119f + kind 'pass')
-- ---------------------------------------------------------------------------
create or replace function public.create_payment_order(p_kind text, p_amount int, p_as_gift boolean default false)
returns public.payment_orders
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_cfg jsonb := donation_config();
  v_tier text;
  v_code int;
  v_order payment_orders;
  v_try int := 0;
  v_gift boolean := coalesce(p_as_gift, false);
  v_period int := 0;
  v_qty int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  perform expire_stale_orders();

  if p_kind = 'monthly' then
    v_tier := 'monthly';
    if p_amount is null or p_amount < (v_cfg->>'monthly_min')::int or p_amount > 10000000 then
      raise exception 'invalid_amount';
    end if;
  elsif p_kind = 'yearly' then
    v_tier := 'yearly';
    v_period := 12;
    if p_amount is distinct from (v_cfg->>'yearly_price')::int then
      raise exception 'invalid_amount';
    end if;
    if not v_gift and exists (select 1 from user_subscriptions where user_id = v_uid and tier_code = 'lifetime') then
      raise exception 'already_lifetime';
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
      if lifetime_total_for(v_uid) + p_amount > (v_cfg->>'lifetime_target')::int then
        raise exception 'exceeds_lifetime_target';
      end if;
    end if;
  elsif p_kind = 'pass' then
    v_tier := 'pass';
    if v_gift then raise exception 'pass_gift_not_supported'; end if;
    if p_amount is null or p_amount <= 0 or p_amount % (v_cfg->>'pass_price_idr')::int <> 0 then
      raise exception 'invalid_amount';
    end if;
    v_qty := p_amount / (v_cfg->>'pass_price_idr')::int;
    if v_qty > (v_cfg->>'pass_max_per_order')::int then raise exception 'invalid_amount'; end if;
    if not has_active_full(v_uid) then raise exception 'not_full'; end if;
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
      where o.amount_idr = p_amount + c
        and (o.status in ('pending', 'claimed') or (o.status = 'expired' and o.created_at > now() - interval '48 hours'))
    )
    order by c limit 1;
    if v_code is null then raise exception 'no_unique_code'; end if;

    begin
      insert into payment_orders (order_code, user_id, tier_code, period_months, base_price_idr, unique_code, amount_idr, as_gift, quantity)
      values (
        'SQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
        v_uid, v_tier, v_period, p_amount, v_code, p_amount + v_code, v_gift, v_qty
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

-- Surat konfirmasi pembelian pass (kotak hadiah jenis 'pass').
create or replace function public.mail_send_pass_letter(p_user uuid, p_qty int, p_amount int, p_order uuid, p_auto boolean, p_note text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_body text;
  v_id uuid;
  v_balance int;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_user is null then return null; end if;
  perform mail_ensure_mailbox(p_user);
  select coalesce(nullif(btrim(player_name), ''), 'Petualang') into v_name from leaderboard where user_id = p_user::text;
  v_name := coalesce(v_name, 'Petualang');
  select coalesce((select balance from pass_wallets where user_id = p_user), 0) into v_balance;

  v_body := 'Halo ' || v_name || E',\n\n'
    || 'Pembelian ' || p_qty || ' Pack Pass (' || fmt_idr(p_amount) || ') sudah kami terima'
    || case when p_auto then ' dan terverifikasi otomatis' else '' end || '. '
    || 'Saldo pass-mu sekarang ' || v_balance || E'.\n\n'
    || 'Pakai pass di Toko (Buku Saku) untuk membuka pack. Pack yang sudah dibuka menjadi milikmu selamanya.';
  if v_note is not null then
    v_body := 'Halo ' || v_name || E',\n\n' || left(v_note, 4000);
  end if;

  insert into letters (
    sender_id, from_admin, is_anonymous, sender_name, sender_address, recipient_id, to_admin,
    subject, body, category, stationery, priority, gift, gift_order_id
  ) values (
    null, true, false, 'Admin SevnQuest', 'SQ-PUSAT', p_user, false,
    left(p_qty || ' Pack Pass sudah masuk', 120), left(v_body, 5000), 'donation', 'kilat', 0,
    jsonb_build_object('kind', 'pass', 'amount', p_amount, 'auto', coalesce(p_auto, false), 'passes', p_qty, 'pass_balance', v_balance),
    p_order
  )
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.mail_send_pass_letter(uuid, int, int, uuid, boolean, text) from public, anon, authenticated;

-- Surat "sedang diproses": sebut pembelian pass dengan benar.
create or replace function public.mail_send_processing_letter(
  p_user uuid, p_order uuid, p_order_code text, p_tier_code text, p_amount int, p_as_gift boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_plan text;
  v_id   uuid;
begin
  if p_user is null then return null; end if;
  if p_order is not null and exists (
    select 1 from letters where gift_order_id = p_order and gift is null and recipient_id = p_user
  ) then
    return null;
  end if;
  perform mail_ensure_mailbox(p_user);
  select coalesce(nullif(btrim(player_name), ''), 'Petualang') into v_name from leaderboard where user_id = p_user::text;
  v_name := coalesce(v_name, 'Petualang');
  v_plan := case p_tier_code
              when 'monthly' then 'donasi bulanan'
              when 'yearly' then 'Paket Tahunan'
              when 'lifetime_unit' then 'setoran lifetime'
              when 'pass' then 'pembelian Pack Pass'
              else 'donasi'
            end || case when coalesce(p_as_gift, false) then ' (hadiah)' else '' end;

  insert into letters (
    sender_id, from_admin, is_anonymous, sender_name, sender_address, recipient_id, to_admin,
    subject, body, category, stationery, priority, gift, gift_order_id
  ) values (
    null, true, false, 'Admin SevnQuest', 'SQ-PUSAT', p_user, false,
    left(case when p_tier_code = 'pass' then 'Pembelian pass-mu sedang diproses (' else 'Pengajuan donasimu sedang diproses (' end
         || coalesce(p_order_code, '-') || ')', 120),
    'Halo ' || v_name || E',\n\n'
      || 'Pengajuan ' || v_plan || ' sebesar ' || fmt_idr(p_amount) || ' dengan kode ' || coalesce(p_order_code, '-')
      || E' sudah kami terima dan sedang diproses.\n\n'
      || 'Sebagian besar pembayaran terverifikasi otomatis dalam beberapa menit. Bila belum, admin akan memeriksanya secara '
      || 'manual paling lambat 1 x 24 jam. Setelah terverifikasi, surat terima kasih berisi kotak hadiah akan datang ke kotak '
      || E'pos ini, lengkap dengan rincian yang kamu dapat.\n\n'
      || 'Ada kendala? Balas surat ini dan sebutkan kode pesananmu.',
    'donation', 'classic', 0, null, p_order
  )
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.mail_send_processing_letter(uuid, uuid, text, text, int, boolean) from public, anon, authenticated;

-- Persetujuan pesanan (definisi terbaru dari 20261119c + cabang 'pass').
create or replace function public.approve_order_internal(p_order_id uuid, p_verifier uuid, p_note text default null)
returns public.payment_orders
language plpgsql security definer set search_path = public as $$
declare
  v_order payment_orders;
  v_kind text;
  v_code text;
  v_try int := 0;
  v_qty int;
begin
  select * into v_order from payment_orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'order_not_found'; end if;
  if v_order.status not in ('pending', 'claimed', 'expired', 'rejected') then raise exception 'order_not_approvable'; end if;
  if v_order.tier_code not in ('monthly', 'lifetime_unit', 'yearly', 'pass') then raise exception 'legacy_plan_not_supported'; end if;

  if v_order.tier_code = 'pass' then
    v_qty := coalesce(v_order.quantity, v_order.base_price_idr / (donation_config()->>'pass_price_idr')::int);
    perform grant_passes_internal(v_order.user_id, v_qty, 'purchase', 'order:' || v_order.id, v_order.id);
    update payment_orders
       set status = 'paid', verified_by = p_verifier, verified_at = now(), reject_reason = null
     where id = p_order_id
    returning * into v_order;
    begin
      perform mail_send_pass_letter(v_order.user_id, v_qty, v_order.base_price_idr, v_order.id, p_verifier is null, p_note);
    exception when others then
      raise warning 'pass letter failed for order %: %', v_order.id, sqlerrm;
    end;
    return v_order;
  end if;

  v_kind := case v_order.tier_code when 'monthly' then 'monthly' when 'yearly' then 'yearly' else 'lifetime' end;

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
    perform apply_donation_internal(v_order.user_id, v_kind, v_order.base_price_idr, v_order.id, wib_month(v_order.created_at));
    update access_keys set redeemed_by = v_order.user_id, redeemed_at = now() where code = v_code;
  end if;

  update payment_orders
     set status = 'paid', verified_by = p_verifier, verified_at = now(), reject_reason = null
   where id = p_order_id
  returning * into v_order;

  -- Surat hadiah tidak boleh menggagalkan pembayaran yang sudah tercatat.
  begin
    perform mail_send_donation_letter(
      v_order.user_id, v_kind, v_order.base_price_idr, v_order.id, p_verifier is null, p_note,
      case when v_order.as_gift then v_code end
    );
  exception when others then
    raise warning 'donation letter failed for order %: %', v_order.id, sqlerrm;
  end;
  return v_order;
end;
$$;
revoke all on function public.approve_order_internal(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.approve_order_internal(uuid, uuid, text) to service_role;

-- Entitlement (definisi terbaru dari 20261119b + pass_balance).
create or replace function public.entitlement_for(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_cfg jsonb := donation_config();
  v_lifetime boolean;
  v_full_exp timestamptz;
  v_access text := 'basic';
  v_lifetime_total int;
  v_month text := wib_month();
  v_month_total int;
  v_badge jsonb;
begin
  select exists (
    select 1 from user_subscriptions where user_id = p_user and tier_code = 'lifetime' and expires_at is null
  ) into v_lifetime;

  select max(expires_at) into v_full_exp
    from user_subscriptions
   where user_id = p_user and tier_code in ('full', 'medium') and expires_at + interval '3 days' > now();
  if v_full_exp is not null then v_access := 'full'; end if;
  if v_lifetime then v_access := 'full'; v_full_exp := null; end if;

  v_lifetime_total := lifetime_total_for(p_user);
  select coalesce(sum(amount_idr), 0) into v_month_total from donations where user_id = p_user and kind = 'monthly' and month = v_month;
  v_badge := badge_for(v_lifetime_total);

  return jsonb_build_object(
    'access_tier', v_access,
    'access_expires_at', v_full_exp,
    'access_in_grace', v_full_exp is not null and v_full_exp < now(),
    'is_lifetime', v_lifetime,
    'lifetime_total', v_lifetime_total,
    'badge_level', (v_badge->>'level')::int,
    'badge_title', v_badge->>'title',
    'month', v_month,
    'month_total', v_month_total,
    'month_tier', month_tier_for(v_month_total),
    'month_unlocked', exists (select 1 from monthly_grants where user_id = p_user and month = v_month),
    'is_yearly', exists (select 1 from donations where user_id = p_user and kind = 'yearly'),
    'pass_balance', coalesce((select balance from pass_wallets where user_id = p_user), 0),
    'config', v_cfg,
    'monetization_public', monetization_public(),
    'is_admin', exists (select 1 from admins where user_id = p_user)
  );
end;
$$;
revoke all on function public.entitlement_for(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. RPC klien
-- ---------------------------------------------------------------------------
create or replace function public.get_my_pass_state() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  perform sync_pass_drips_internal(v_uid);
  return pass_state_for(v_uid);
end;
$$;
revoke all on function public.get_my_pass_state() from public, anon;
grant execute on function public.get_my_pass_state() to authenticated;

create or replace function public.get_store_catalog() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_packs jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  perform sync_pass_drips_internal(v_uid);
  v_admin := exists (select 1 from admins where user_id = v_uid);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'title', p.title, 'level', p.level, 'description', p.description, 'cover_icon', p.cover_icon,
           'price_passes', p.price_passes, 'item_count', p.item_count, 'chapter_summary', p.chapter_summary,
           'sources', p.sources, 'preview', p.preview, 'status', p.status, 'content_version', p.content_version,
           'owned', up.user_id is not null, 'unlocked_at', up.unlocked_at
         ) order by p.sort_order, p.id), '[]'::jsonb)
    into v_packs
    from packs p
    left join user_packs up on up.pack_id = p.id and up.user_id = v_uid
   where p.status = 'published'
      or (p.status = 'retired' and up.user_id is not null)
      or (v_admin and p.status = 'draft');

  return jsonb_build_object('packs', v_packs, 'pass', pass_state_for(v_uid));
end;
$$;
revoke all on function public.get_store_catalog() from public, anon;
grant execute on function public.get_store_catalog() to authenticated;

create or replace function public.get_pack_contents(p_pack_id text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row pack_contents;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from user_packs where user_id = v_uid and pack_id = p_pack_id)
     and not exists (select 1 from admins where user_id = v_uid) then
    raise exception 'not_owned';
  end if;
  select * into v_row from pack_contents where pack_id = p_pack_id;
  if v_row.pack_id is null then raise exception 'pack_not_found'; end if;
  return jsonb_build_object('pack_id', v_row.pack_id, 'content_version', v_row.content_version, 'book', v_row.book);
end;
$$;
revoke all on function public.get_pack_contents(text) from public, anon;
grant execute on function public.get_pack_contents(text) to authenticated;

create or replace function public.list_my_packs() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'pack_id', up.pack_id, 'unlocked_at', up.unlocked_at, 'content_version', coalesce(c.content_version, 0)
         ) order by up.unlocked_at), '[]'::jsonb)
    from user_packs up
    left join pack_contents c on c.pack_id = up.pack_id
   where up.user_id = auth.uid();
$$;
revoke all on function public.list_my_packs() from public, anon;
grant execute on function public.list_my_packs() to authenticated;

-- Buka pack: satu transaksi, dompet dikunci, tidak bisa terpotong dua kali.
create or replace function public.unlock_pack(p_pack_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_pack packs;
  v_balance int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  perform sync_pass_drips_internal(v_uid);
  v_balance := pass_wallet_lock(v_uid);

  if exists (select 1 from user_packs where user_id = v_uid and pack_id = p_pack_id) then
    raise exception 'already_owned';
  end if;
  select * into v_pack from packs where id = p_pack_id;
  if v_pack.id is null or v_pack.status <> 'published'
     or not exists (select 1 from pack_contents where pack_id = p_pack_id) then
    raise exception 'pack_not_available';
  end if;
  if v_balance < v_pack.price_passes then raise exception 'insufficient_passes'; end if;

  perform grant_passes_internal(v_uid, -v_pack.price_passes, 'spend', null, null, null, v_pack.id, v_pack.title);
  insert into user_packs (user_id, pack_id, passes_spent, source) values (v_uid, v_pack.id, v_pack.price_passes, 'purchase');

  return get_pack_contents(p_pack_id) || jsonb_build_object('pass', pass_state_for(v_uid));
end;
$$;
revoke all on function public.unlock_pack(text) from public, anon;
grant execute on function public.unlock_pack(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. RPC admin
-- ---------------------------------------------------------------------------
-- p_meta: { id, title, level, description, cover_icon, price_passes, status, sort_order }
-- p_book: OfficialBook (jsonb) atau null untuk hanya mengubah metadata.
-- item_count, chapter_summary, sources, preview dihitung dari p_book.
-- upsert_pack_internal dipanggil dari SQL Editor (scripts/packs/out/<pack>/upload.sql) atau lewat admin_upsert_pack.
create or replace function public.upsert_pack_internal(p_meta jsonb, p_book jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id text := p_meta->>'id';
  v_count int;
  v_chapters jsonb;
  v_preview jsonb;
  v_sources jsonb;
  v_changed boolean;
  v_version int;
begin
  if v_id is null then raise exception 'invalid_pack'; end if;

  insert into packs (id, title, level, description, cover_icon, price_passes, status, sort_order)
  values (
    v_id, coalesce(p_meta->>'title', v_id), coalesce(p_meta->>'level', 'TEMATIK'), coalesce(p_meta->>'description', ''),
    coalesce(p_meta->>'cover_icon', 'package'), coalesce((p_meta->>'price_passes')::int, 1),
    coalesce(p_meta->>'status', 'draft'), coalesce((p_meta->>'sort_order')::int, 0)
  )
  on conflict (id) do update set
    title        = coalesce(p_meta->>'title', packs.title),
    level        = coalesce(p_meta->>'level', packs.level),
    description  = coalesce(p_meta->>'description', packs.description),
    cover_icon   = coalesce(p_meta->>'cover_icon', packs.cover_icon),
    price_passes = coalesce((p_meta->>'price_passes')::int, packs.price_passes),
    status       = coalesce(p_meta->>'status', packs.status),
    sort_order   = coalesce((p_meta->>'sort_order')::int, packs.sort_order),
    updated_at   = now();

  if p_book is not null then
    if jsonb_typeof(p_book->'chapters') <> 'array' then raise exception 'invalid_book'; end if;

    select count(distinct (it->>'category') || ':' || (it->>'id'))::int
      into v_count
      from jsonb_array_elements(p_book->'chapters') ch, jsonb_array_elements(ch->'items') it;
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', ch->>'id', 'title', coalesce(ch->>'titleId', ch->>'titleJp'),
             'count', jsonb_array_length(coalesce(ch->'items', '[]'::jsonb))
           ) order by (ch->>'chapterNumber')::int), '[]'::jsonb)
      into v_chapters
      from jsonb_array_elements(p_book->'chapters') ch;
    select coalesce(jsonb_agg(it), '[]'::jsonb) into v_preview
      from (select it from jsonb_array_elements(p_book->'chapters'->0->'items') it limit 15) s;
    v_sources := coalesce(p_book->'sources', p_meta->'sources', '[]'::jsonb);

    select (c.book is distinct from p_book) into v_changed from pack_contents c where c.pack_id = v_id;
    insert into pack_contents (pack_id, book, content_version) values (v_id, p_book, 1)
    on conflict (pack_id) do update set
      book = excluded.book,
      content_version = pack_contents.content_version + case when coalesce(v_changed, true) then 1 else 0 end,
      updated_at = now()
    returning content_version into v_version;

    update packs set item_count = v_count, chapter_summary = v_chapters, preview = v_preview, sources = v_sources,
                     content_version = v_version, updated_at = now()
     where id = v_id;
  end if;

  return (select to_jsonb(p) from packs p where p.id = v_id);
end;
$$;
revoke all on function public.upsert_pack_internal(jsonb, jsonb) from public, anon, authenticated;

create or replace function public.admin_upsert_pack(p_meta jsonb, p_book jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return upsert_pack_internal(p_meta, p_book);
end;
$$;
revoke all on function public.admin_upsert_pack(jsonb, jsonb) from public, anon;
grant execute on function public.admin_upsert_pack(jsonb, jsonb) to authenticated;

create or replace function public.admin_grant_passes(p_user uuid, p_delta int, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_user is null or coalesce(p_delta, 0) = 0 or abs(p_delta) > 1000 then raise exception 'invalid_amount'; end if;
  perform grant_passes_internal(p_user, p_delta, 'admin', null, null, null, null, left(coalesce(p_note, ''), 500));
  return pass_state_for(p_user);
end;
$$;
revoke all on function public.admin_grant_passes(uuid, int, text) from public, anon;
grant execute on function public.admin_grant_passes(uuid, int, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Backfill pengguna lama (idempoten lewat grant_key dan indeks unik drip)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_cfg jsonb := donation_config();
begin
  -- Donatur bulanan yang sudah membuka Full bulan ini: 3 pass bulan berjalan.
  for r in select user_id, month from monthly_grants where month = wib_month() loop
    perform grant_passes_internal(r.user_id, (v_cfg->>'pass_monthly')::int, 'grant_monthly',
                                  'monthly:' || r.user_id || ':' || r.month, null, null, null, 'Backfill');
  end loop;

  -- Pembeli Tahunan: drip sejak tanggal donasinya (tahap yang sudah lewat ikut diberikan), hanya yang belum lewat setahun.
  for r in select user_id, order_id, created_at from donations
            where kind = 'yearly' and created_at > now() - make_interval(days => (v_cfg->>'yearly_days')::int) loop
    insert into pass_drips (user_id, kind, source_order_id, starts_at, interval_days, passes_per_tranche, tranches_total)
    values (r.user_id, 'yearly', r.order_id, r.created_at, (v_cfg->>'pass_drip_days')::int,
            (v_cfg->>'pass_yearly_tranche')::int, (v_cfg->>'pass_yearly_tranches')::int)
    on conflict do nothing;
  end loop;

  -- Pemegang Lifetime: drip mulai sekarang (tahap 1 langsung).
  for r in select user_id, source_order_id from user_subscriptions where tier_code = 'lifetime' and expires_at is null loop
    insert into pass_drips (user_id, kind, source_order_id, starts_at, interval_days, passes_per_tranche, tranches_total)
    values (r.user_id, 'lifetime', r.source_order_id, now(), (v_cfg->>'pass_drip_days')::int,
            (v_cfg->>'pass_lifetime_drip')::int, null)
    on conflict do nothing;
  end loop;

  for r in select distinct user_id from pass_drips loop
    perform sync_pass_drips_internal(r.user_id);
  end loop;
end;
$$;
