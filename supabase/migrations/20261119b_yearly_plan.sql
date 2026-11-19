-- ============================================================================
-- Paket Tahunan: Rp 102.000 / tahun (setengah dari 12 x Rp 17.000 = Rp 204.000).
--   * Membuka Full 365 hari (setara Tingkat 1 selama setahun; Kotak Pos minimal Premium karena akses Full).
--   * Ikut dihitung ke total lifetime (badge Sakura dst. dan target Full selamanya Rp 700.000).
--   * Pembelinya tampil di bagian Hall of Fame papan donatur bersama pemegang Lifetime.
-- Bisa dibeli untuk diri sendiri atau sebagai hadiah (key), sama seperti jalur lain.
-- Idempoten.
-- ============================================================================

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
    'yearly_days', 365
  );
$$;

insert into public.subscription_tiers (tier_code, type, level, name, title, benefits, active)
values ('yearly', 'donor', 0, 'Donasi Tahunan', null,
        '["Rp 102.000 per tahun (hemat 50%)", "Full 365 hari", "Dihitung ke total lifetime", "Hall of Fame papan donatur"]'::jsonb, true)
on conflict (tier_code) do update set name = excluded.name, benefits = excluded.benefits, active = true;

alter table public.donations drop constraint if exists donations_kind_check;
alter table public.donations add constraint donations_kind_check check (kind in ('monthly', 'lifetime', 'yearly'));
alter table public.access_keys drop constraint if exists access_keys_kind_check;
alter table public.access_keys add constraint access_keys_kind_check check (kind in ('monthly', 'lifetime', 'yearly'));

-- Total yang dihitung ke lifetime (badge & target Full selamanya): setoran lifetime + donasi tahunan.
create or replace function public.lifetime_total_for(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount_idr), 0)::int from donations where user_id = p_user and kind in ('lifetime', 'yearly');
$$;
revoke all on function public.lifetime_total_for(uuid) from public, anon, authenticated;

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
    if p_kind = 'yearly' then
      perform grant_full_days(p_user, (v_cfg->>'yearly_days')::int, p_order);
    else
      perform grant_full_days(p_user, (v_cfg->>'full_days')::int, p_order);
    end if;
    v_total := lifetime_total_for(p_user);
    if v_total >= (v_cfg->>'lifetime_target')::int
       and not exists (select 1 from user_subscriptions where user_id = p_user and tier_code = 'lifetime') then
      insert into user_subscriptions (user_id, tier_code, starts_at, expires_at, source_order_id)
      values (p_user, 'lifetime', now(), null, p_order);
    end if;
  end if;
end;
$$;
revoke all on function public.apply_donation_internal(uuid, text, int, uuid, text) from public, anon, authenticated;

create or replace function public.approve_order_internal(p_order_id uuid, p_verifier uuid)
returns public.payment_orders
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
  if v_order.tier_code not in ('monthly', 'lifetime_unit', 'yearly') then raise exception 'legacy_plan_not_supported'; end if;

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
  return v_order;
end;
$$;
revoke all on function public.approve_order_internal(uuid, uuid) from public, anon, authenticated;

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
        v_uid, v_tier, v_period, p_amount, v_code, p_amount - v_code, v_gift
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

create or replace function public.redeem_access_key(p_code text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_cfg jsonb := donation_config();
  v_key access_keys;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if v_code !~ '^SQ[A-Z0-9]{12}$' then raise exception 'key_invalid'; end if;
  v_code := 'SQ-' || substr(v_code, 3, 4) || '-' || substr(v_code, 7, 4) || '-' || substr(v_code, 11, 4);

  select * into v_key from access_keys where code = v_code for update;
  if v_key.code is null then raise exception 'key_invalid'; end if;
  if v_key.redeemed_by is not null then raise exception 'key_used'; end if;

  if v_key.kind in ('lifetime', 'yearly') then
    if exists (select 1 from user_subscriptions where user_id = v_uid and tier_code = 'lifetime') then
      raise exception 'already_lifetime';
    end if;
    if v_key.kind = 'lifetime' and lifetime_total_for(v_uid) + v_key.amount_idr > (v_cfg->>'lifetime_target')::int then
      raise exception 'exceeds_lifetime_target';
    end if;
  end if;

  perform apply_donation_internal(v_uid, v_key.kind, v_key.amount_idr, v_key.order_id, wib_month(now()));
  update access_keys set redeemed_by = v_uid, redeemed_at = now() where code = v_code;
  return jsonb_build_object('code', v_code, 'kind', v_key.kind, 'amount_idr', v_key.amount_idr);
end;
$$;

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
    'config', v_cfg,
    'monetization_public', monetization_public(),
    'is_admin', exists (select 1 from admins where user_id = p_user)
  );
end;
$$;
revoke all on function public.entitlement_for(uuid) from public, anon, authenticated;

-- Papan donatur: Hall of Fame (Lifetime + pembeli Tahunan), badge, dan donatur bulan ini (urut nominal).
drop function if exists public.get_donor_board();
create or replace function public.get_donor_board()
returns table (
  display_name text, is_anonymous boolean, badge_level int, badge_title text,
  is_lifetime boolean, monthly_this_month boolean, month_tier int, month_rank int, is_yearly boolean
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_month text := wib_month();
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  return query
    with totals as (
      select d.user_id,
             coalesce(sum(d.amount_idr) filter (where d.kind in ('lifetime', 'yearly')), 0)::int as life_total,
             coalesce(sum(d.amount_idr) filter (where d.kind = 'monthly' and d.month = v_month), 0)::int as month_total,
             bool_or(d.kind = 'monthly' and d.month = v_month) as this_month,
             bool_or(d.kind = 'yearly') as yearly,
             max(d.created_at) filter (where d.kind = 'monthly' and d.month = v_month) as month_last
        from donations d
       group by d.user_id
    ), ranked as (
      select t.*,
             case when coalesce(t.this_month, false)
                  then (row_number() over (
                          partition by coalesce(t.this_month, false)
                          order by t.month_total desc, t.month_last asc nulls last))::int
             end as m_rank
        from totals t
    )
    select case when coalesce(p.anonymous, false) then null else coalesce(l.player_name, 'Petualang') end,
           coalesce(p.anonymous, false),
           (badge_for(r.life_total)->>'level')::int,
           badge_for(r.life_total)->>'title',
           exists (select 1 from user_subscriptions s where s.user_id = r.user_id and s.tier_code = 'lifetime'),
           coalesce(r.this_month, false),
           case when coalesce(r.this_month, false) then month_tier_for(r.month_total) else 0 end,
           r.m_rank,
           coalesce(r.yearly, false)
      from ranked r
      left join donor_preferences p on p.user_id = r.user_id
      left join leaderboard l on l.user_id = r.user_id::text
     where r.life_total >= 25000 or r.this_month or r.yearly
     order by 5 desc, 3 desc, r.life_total desc, 8 asc nulls last, 1;
end;
$$;
revoke all on function public.get_donor_board() from public, anon;
grant execute on function public.get_donor_board() to authenticated;
