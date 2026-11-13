-- ============================================================================
-- 7 tingkat donasi bulanan (PRD v0.9). Tingkat dihitung dari total donasi bulanan dalam satu bulan kalender (WIB):
--   T1 Rp 17.000 (minimum, membuka Full 30 hari) · T2 25.000 · T3 35.000 · T4 50.000 · T5 75.000 · T6 100.000
--   T7 Rp 150.000 ke atas.
-- Di atas T1 keuntungan akses sudah maksimal; yang naik hanya "tingkat prioritas" (Kotak Pos & antrean request).
-- Prioritas Kotak Pos = max(prioritas dari akses/badge lifetime, prioritas dari tingkat bulan ini).
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
    'full_days', 30
  );
$$;

create or replace function public.month_tier_for(p_total int) returns int
language sql immutable set search_path = public as $$
  select count(*)::int
    from jsonb_array_elements_text(donation_config()->'monthly_tiers') t
   where coalesce(p_total, 0) >= t::int;
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
    'month_tier', month_tier_for(v_month_total),
    'month_unlocked', exists (select 1 from monthly_grants where user_id = p_user and month = v_month),
    'config', v_cfg,
    'is_admin', exists (select 1 from admins where user_id = p_user)
  );
end;
$$;
revoke all on function public.entitlement_for(uuid) from public, anon, authenticated;

-- Prioritas Kotak Pos: tingkat bulan ini ikut menaikkan prioritas (T1 = Premium, T2..T7 = Super Premium Lv.1..6).
create or replace function public.mail_plan_for(p_uid uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_ent    jsonb;
  v_badge  int;
  v_rank   int := 0;
  v_badge_rank int := 0;
  v_month_rank int := 0;
  v_titles constant text[] := array['Sakura', 'Ume', 'Take', 'Matsu', 'Tsuki', 'Taiyou', 'Fuji'];
  v_limits constant int[] := array[3, 6, 8, 10, 12, 15, 18, 22, 30];
  v_label  text;
begin
  if exists (select 1 from public.admins where user_id = p_uid) then
    return jsonb_build_object('tier', 'admin', 'rank', 9, 'label', 'Admin', 'daily_limit', null, 'priority', 9);
  end if;

  v_ent := public.entitlement_for(p_uid);
  v_badge := least(coalesce((v_ent->>'badge_level')::int, 0), 7);
  if v_badge >= 1 then
    v_badge_rank := 1 + v_badge;
  elsif v_ent->>'access_tier' = 'full' then
    v_badge_rank := 1;
  end if;
  v_month_rank := least(coalesce((v_ent->>'month_tier')::int, 0), 7);
  v_rank := greatest(v_badge_rank, v_month_rank);

  v_label := case
    when v_rank = 0 then 'Free'
    when v_rank = 1 then 'Premium'
    when v_rank = v_badge_rank then 'Super Premium Lv.' || (v_rank - 1) || ' · ' || v_titles[v_rank - 1]
    else 'Super Premium Lv.' || (v_rank - 1)
  end;

  return jsonb_build_object(
    'tier', case when v_rank = 0 then 'free' when v_rank = 1 then 'premium' else 'super' || (v_rank - 1) end,
    'rank', v_rank,
    'label', v_label,
    'daily_limit', v_limits[v_rank + 1],
    'priority', v_rank
  );
end;
$$;
revoke all on function public.mail_plan_for(uuid) from public, anon, authenticated;
