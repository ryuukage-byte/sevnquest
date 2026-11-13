-- ============================================================================
-- Saklar "monetisasi tampil ke pengguna" (app_flags.monetization_public).
--
-- MATI (bawaan): sistem pembayaran, donasi, key, dan verifikasi otomatis tetap berjalan untuk admin,
--   tetapi pengguna biasa tidak melihat premium apa pun dan tidak ada materi/fitur yang dikunci
--   (klien membaca flag dari get_my_entitlement; Deck AI dan Imersi di server ikut terbuka).
-- NYALA: gating per paket dan halaman donasi tampil untuk semua pengguna.
-- Admin mengubahnya lewat admin_set_monetization_public (halaman Verifikasi Pembayaran).
-- Idempoten.
-- ============================================================================

create table if not exists public.app_flags (
  key        text primary key,
  enabled    boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.app_flags enable row level security;
revoke all on public.app_flags from anon, authenticated;

insert into public.app_flags (key, enabled) values ('monetization_public', false)
on conflict (key) do nothing;

create or replace function public.monetization_public() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select enabled from app_flags where key = 'monetization_public'), false);
$$;
revoke all on function public.monetization_public() from public, anon, authenticated;

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
    'monetization_public', monetization_public(),
    'is_admin', exists (select 1 from admins where user_id = p_user)
  );
end;
$$;
revoke all on function public.entitlement_for(uuid) from public, anon, authenticated;

create or replace function public.get_my_entitlement() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('access_tier', 'basic', 'is_lifetime', false, 'is_admin', false,
                              'config', donation_config(), 'monetization_public', monetization_public());
  end if;
  return entitlement_for(auth.uid());
end;
$$;

-- Deck AI: selama monetisasi belum tampil, semua pengguna login boleh memakai (tanpa kuota paket).
create or replace function public.consume_ai_quota(p_limit int default 30) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'Asia/Jakarta')::date;
  v_count int;
begin
  if v_uid is null then return jsonb_build_object('allowed', false, 'reason', 'not_authenticated'); end if;
  if not monetization_public() then return jsonb_build_object('allowed', true, 'reason', 'monetization_hidden'); end if;
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

create or replace function public.admin_set_monetization_public(p_enabled boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  insert into app_flags (key, enabled, updated_at) values ('monetization_public', coalesce(p_enabled, false), now())
  on conflict (key) do update set enabled = excluded.enabled, updated_at = now();
  return coalesce(p_enabled, false);
end;
$$;
revoke all on function public.admin_set_monetization_public(boolean) from public, anon;
grant execute on function public.admin_set_monetization_public(boolean) to authenticated;
