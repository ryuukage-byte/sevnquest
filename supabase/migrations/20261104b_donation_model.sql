-- ============================================================================
-- Model donasi (PRD v0.6) menggantikan paket harga tetap dari 20261104_monetization.sql.
--
--   Jalur bulanan : nominal bebas (min. Rp 5.000). Total donasi bulanan dalam satu bulan kalender (WIB)
--                   >= Rp 17.000 membuka Full 30 hari (sekali per bulan; kelebihan tetap tercatat).
--   Jalur lifetime: setoran kelipatan Rp 25.000. Tiap setoran membuka Full 30 hari. Total setoran
--                   >= Rp 700.000 = Full selamanya + title Eien. Badge permanen naik sesuai total.
--
-- Akses kini dua tingkat: basic (kana-N5) dan full. Tier 'medium' tidak dijual lagi.
-- File ini idempoten.
-- ============================================================================

insert into public.subscription_tiers (tier_code, type, level, name, title, benefits) values
  ('monthly',       'donor',    0, 'Donasi Bulanan',  null, '["Nominal bebas","Total sebulan >= Rp 17.000 membuka Full 30 hari"]'),
  ('lifetime_unit', 'lifetime', 0, 'Setoran Lifetime', null, '["Kelipatan Rp 25.000","Tiap setoran membuka Full 30 hari","Total Rp 700.000 = Full selamanya"]')
on conflict (tier_code) do update set type = excluded.type, name = excluded.name, benefits = excluded.benefits;

update public.subscription_tiers set active = false where tier_code in ('medium', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7');

-- Riwayat donasi yang sudah diverifikasi (satu baris per pesanan yang disetujui).
create table if not exists public.donations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  order_id   uuid not null unique references public.payment_orders (id),
  kind       text not null check (kind in ('monthly', 'lifetime')),
  amount_idr int  not null check (amount_idr > 0),
  month      text not null, -- 'YYYY-MM' (WIB) saat pesanan dibuat
  created_at timestamptz not null default now()
);
create index if not exists donations_user_idx on public.donations (user_id, kind, month);
alter table public.donations enable row level security;
drop policy if exists donations_select_own on public.donations;
create policy donations_select_own on public.donations for select to authenticated using (auth.uid() = user_id);
revoke all on public.donations from anon, authenticated;
grant select on public.donations to authenticated;

-- Penanda bulan yang sudah membuka Full lewat jalur bulanan (sekali per bulan).
create table if not exists public.monthly_grants (
  user_id    uuid not null references auth.users (id) on delete cascade,
  month      text not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, month)
);
alter table public.monthly_grants enable row level security;
revoke all on public.monthly_grants from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Konstanta & helper
-- ---------------------------------------------------------------------------
create or replace function public.donation_config() returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'monthly_threshold', 17000,
    'monthly_min', 5000,
    'lifetime_unit', 25000,
    'lifetime_target', 700000,
    'full_days', 30
  );
$$;

create or replace function public.wib_month(p_at timestamptz default now()) returns text
language sql stable as $$
  select to_char(p_at at time zone 'Asia/Jakarta', 'YYYY-MM');
$$;

-- Badge permanen dari total setoran lifetime.
create or replace function public.badge_for(p_total int) returns jsonb
language sql immutable as $$
  select case
    when p_total >= 700000 then '{"level":8,"title":"Eien"}'::jsonb
    when p_total >= 600000 then '{"level":7,"title":"Fuji"}'::jsonb
    when p_total >= 450000 then '{"level":6,"title":"Taiyou"}'::jsonb
    when p_total >= 300000 then '{"level":5,"title":"Tsuki"}'::jsonb
    when p_total >= 200000 then '{"level":4,"title":"Matsu"}'::jsonb
    when p_total >= 100000 then '{"level":3,"title":"Take"}'::jsonb
    when p_total >= 50000  then '{"level":2,"title":"Ume"}'::jsonb
    when p_total >= 25000  then '{"level":1,"title":"Sakura"}'::jsonb
    else '{"level":0,"title":null}'::jsonb
  end;
$$;

-- Tambah Full N hari, bersambung dari akhir Full yang masih aktif.
create or replace function public.grant_full_days(p_user uuid, p_days int, p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_start timestamptz;
begin
  select greatest(now(), coalesce(max(expires_at), now())) into v_start
    from user_subscriptions
   where user_id = p_user and tier_code = 'full' and expires_at > now();
  insert into user_subscriptions (user_id, tier_code, starts_at, expires_at, source_order_id)
  values (p_user, 'full', v_start, v_start + make_interval(days => p_days), p_order);
end;
$$;
revoke all on function public.grant_full_days(uuid, int, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Entitlement
-- ---------------------------------------------------------------------------
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

  select coalesce(sum(amount_idr), 0) into v_lifetime_total from donations where user_id = p_user and kind = 'lifetime';
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
    'month_unlocked', exists (select 1 from monthly_grants where user_id = p_user and month = v_month),
    'config', v_cfg,
    'is_admin', exists (select 1 from admins where user_id = p_user)
  );
end;
$$;
revoke all on function public.entitlement_for(uuid) from public, anon, authenticated;

create or replace function public.get_my_entitlement() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('access_tier', 'basic', 'is_lifetime', false, 'is_admin', false, 'config', donation_config());
  end if;
  return entitlement_for(auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Pesanan
-- ---------------------------------------------------------------------------
drop function if exists public.create_payment_order(text, int);
create or replace function public.create_payment_order(p_kind text, p_amount int)
returns public.payment_orders
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_cfg jsonb := donation_config();
  v_tier text;
  v_code int;
  v_order payment_orders;
  v_life_total int;
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
    if exists (select 1 from user_subscriptions where user_id = v_uid and tier_code = 'lifetime') then
      raise exception 'already_lifetime';
    end if;
    if p_amount is null or p_amount < (v_cfg->>'lifetime_unit')::int or p_amount % (v_cfg->>'lifetime_unit')::int <> 0 then
      raise exception 'invalid_amount';
    end if;
    select coalesce(sum(amount_idr), 0) into v_life_total from donations where user_id = v_uid and kind = 'lifetime';
    if v_life_total + p_amount > (v_cfg->>'lifetime_target')::int then
      raise exception 'exceeds_lifetime_target';
    end if;
  else
    raise exception 'invalid_plan';
  end if;

  if (select count(*) from payment_orders where user_id = v_uid and status = 'pending') >= 3 then
    raise exception 'too_many_pending';
  end if;

  -- Kode unik 1-99 (lalu 100-999) yang belum dipakai pesanan terbuka dengan nominal dasar yang sama.
  select c into v_code from generate_series(1, least(999, p_amount / 10)) c
  where not exists (
    select 1 from payment_orders o
    where o.base_price_idr = p_amount and o.unique_code = c and o.status in ('pending', 'claimed')
  )
  order by c limit 1;
  if v_code is null then raise exception 'no_unique_code'; end if;

  insert into payment_orders (order_code, user_id, tier_code, period_months, base_price_idr, unique_code, amount_idr)
  values (
    'SQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
    v_uid, v_tier, 0, p_amount, v_code, p_amount - v_code
  )
  returning * into v_order;
  return v_order;
end;
$$;
revoke all on function public.create_payment_order(text, int) from public, anon;
grant execute on function public.create_payment_order(text, int) to authenticated;

-- Persetujuan admin: catat donasi, lalu beri hadiah sesuai jalurnya.
create or replace function public.approve_payment(p_order_id uuid) returns public.payment_orders
language plpgsql security definer set search_path = public as $$
declare
  v_cfg jsonb := donation_config();
  v_order payment_orders;
  v_kind text;
  v_month text;
  v_total int;
begin
  if not is_admin() then raise exception 'forbidden'; end if;

  select * into v_order from payment_orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'order_not_found'; end if;
  if v_order.status not in ('pending', 'claimed', 'expired', 'rejected') then raise exception 'order_not_approvable'; end if;

  v_month := wib_month(v_order.created_at);

  if v_order.tier_code in ('monthly', 'lifetime_unit') then
    v_kind := case when v_order.tier_code = 'monthly' then 'monthly' else 'lifetime' end;
    -- Yang dikreditkan nominal dasar; potongan kode unik ditanggung SevnQuest.
    insert into donations (user_id, order_id, kind, amount_idr, month)
    values (v_order.user_id, v_order.id, v_kind, v_order.base_price_idr, v_month);

    if v_kind = 'monthly' then
      select coalesce(sum(amount_idr), 0) into v_total
        from donations where user_id = v_order.user_id and kind = 'monthly' and month = v_month;
      if v_total >= (v_cfg->>'monthly_threshold')::int
         and not exists (select 1 from monthly_grants where user_id = v_order.user_id and month = v_month) then
        insert into monthly_grants (user_id, month) values (v_order.user_id, v_month);
        perform grant_full_days(v_order.user_id, (v_cfg->>'full_days')::int, v_order.id);
      end if;
    else
      perform grant_full_days(v_order.user_id, (v_cfg->>'full_days')::int, v_order.id);
      select coalesce(sum(amount_idr), 0) into v_total from donations where user_id = v_order.user_id and kind = 'lifetime';
      if v_total >= (v_cfg->>'lifetime_target')::int
         and not exists (select 1 from user_subscriptions where user_id = v_order.user_id and tier_code = 'lifetime') then
        insert into user_subscriptions (user_id, tier_code, starts_at, expires_at, source_order_id)
        values (v_order.user_id, 'lifetime', now(), null, v_order.id);
      end if;
    end if;
  else
    raise exception 'legacy_plan_not_supported';
  end if;

  update payment_orders
     set status = 'paid', verified_by = auth.uid(), verified_at = now(), reject_reason = null
   where id = p_order_id
  returning * into v_order;
  return v_order;
end;
$$;
revoke all on function public.approve_payment(uuid) from public, anon;
grant execute on function public.approve_payment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Papan donatur: pemegang badge lifetime + donatur bulan ini. Nominal tidak ditampilkan.
-- ---------------------------------------------------------------------------
drop function if exists public.get_donor_board();
create or replace function public.get_donor_board()
returns table (display_name text, is_anonymous boolean, badge_level int, badge_title text, is_lifetime boolean, monthly_this_month boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_month text := wib_month();
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  return query
    with totals as (
      select d.user_id,
             coalesce(sum(d.amount_idr) filter (where d.kind = 'lifetime'), 0)::int as life_total,
             bool_or(d.kind = 'monthly' and d.month = v_month) as this_month
        from donations d
       group by d.user_id
    )
    select case when coalesce(p.anonymous, false) then null else coalesce(l.player_name, 'Petualang') end,
           coalesce(p.anonymous, false),
           (badge_for(t.life_total)->>'level')::int,
           badge_for(t.life_total)->>'title',
           exists (select 1 from user_subscriptions s where s.user_id = t.user_id and s.tier_code = 'lifetime'),
           coalesce(t.this_month, false)
      from totals t
      left join donor_preferences p on p.user_id = t.user_id
      left join leaderboard l on l.user_id = t.user_id::text
     where t.life_total >= 25000 or t.this_month
     order by 3 desc, 6 desc, 1;
end;
$$;
revoke all on function public.get_donor_board() from public, anon;
grant execute on function public.get_donor_board() to authenticated;

-- Advisor Supabase: kunci search_path fungsi helper.
alter function public.donation_config() set search_path = public;
alter function public.wib_month(timestamptz) set search_path = public;
alter function public.badge_for(int) set search_path = public;
