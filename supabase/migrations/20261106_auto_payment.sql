-- ============================================================================
-- Verifikasi pembayaran otomatis lewat notifikasi HP (PRD 6.3, jalan tengah sebelum payment gateway).
--
-- HP Android yang memasang GoPay Merchant meneruskan notifikasi "uang masuk" ke Cloudflare Function
-- /api/payment-notify (mis. lewat MacroDroid). Function memanggil gateway_payment_received dengan kunci
-- webhook. Bila nominal cocok dengan TEPAT SATU pesanan terbuka, pesanan disetujui otomatis; selain itu
-- dicatat dan ditinggalkan untuk verifikasi manual.
--
-- Kunci webhook dibuat admin dari halaman Verifikasi Pembayaran; yang disimpan hanya hash SHA-256.
-- Idempoten.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.payment_gateway_keys (
  id         int primary key default 1 check (id = 1),
  key_hash   text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
alter table public.payment_gateway_keys enable row level security;
revoke all on public.payment_gateway_keys from anon, authenticated;

create table if not exists public.payment_events (
  id          bigserial primary key,
  received_at timestamptz not null default now(),
  amount_idr  int,
  raw_text    text,
  result      text not null, -- approved | unmatched | ambiguous | no_amount | error
  order_id    uuid references public.payment_orders (id)
);
create index if not exists payment_events_received_idx on public.payment_events (received_at desc);
alter table public.payment_events enable row level security;
revoke all on public.payment_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Nominal unik di SEMUA pesanan terbuka (bukan hanya yang harga dasarnya sama), supaya satu nominal
-- uang masuk selalu menunjuk tepat satu pesanan. Pesanan kedaluwarsa < 48 jam ikut dihitung karena
-- pembayaran telat masih dicocokkan.
-- ---------------------------------------------------------------------------
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

  select c into v_code from generate_series(1, least(999, p_amount / 10)) c
  where not exists (
    select 1 from payment_orders o
    where o.amount_idr = p_amount - c
      and (o.status in ('pending', 'claimed') or (o.status = 'expired' and o.created_at > now() - interval '48 hours'))
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

-- ---------------------------------------------------------------------------
-- Persetujuan: logika dipindah ke fungsi internal yang dipakai admin dan verifikasi otomatis.
-- ---------------------------------------------------------------------------
create or replace function public.approve_order_internal(p_order_id uuid, p_verifier uuid) returns public.payment_orders
language plpgsql security definer set search_path = public as $$
declare
  v_cfg jsonb := donation_config();
  v_order payment_orders;
  v_kind text;
  v_month text;
  v_total int;
begin
  select * into v_order from payment_orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'order_not_found'; end if;
  if v_order.status not in ('pending', 'claimed', 'expired', 'rejected') then raise exception 'order_not_approvable'; end if;

  v_month := wib_month(v_order.created_at);

  if v_order.tier_code in ('monthly', 'lifetime_unit') then
    v_kind := case when v_order.tier_code = 'monthly' then 'monthly' else 'lifetime' end;
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
     set status = 'paid', verified_by = p_verifier, verified_at = now(), reject_reason = null
   where id = p_order_id
  returning * into v_order;
  return v_order;
end;
$$;
revoke all on function public.approve_order_internal(uuid, uuid) from public, anon, authenticated;

create or replace function public.approve_payment(p_order_id uuid) returns public.payment_orders
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return approve_order_internal(p_order_id, auth.uid());
end;
$$;
revoke all on function public.approve_payment(uuid) from public, anon;
grant execute on function public.approve_payment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Kunci webhook (admin) dan penerima notifikasi (dipanggil Cloudflare Function dengan anon key + kunci).
-- ---------------------------------------------------------------------------
create or replace function public.admin_rotate_gateway_key() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_key text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  insert into payment_gateway_keys (id, key_hash, created_by, created_at)
  values (1, encode(extensions.digest(v_key, 'sha256'), 'hex'), auth.uid(), now())
  on conflict (id) do update set key_hash = excluded.key_hash, created_by = excluded.created_by, created_at = now();
  return v_key;
end;
$$;
revoke all on function public.admin_rotate_gateway_key() from public, anon;
grant execute on function public.admin_rotate_gateway_key() to authenticated;

create or replace function public.gateway_payment_received(p_key text, p_amount int, p_raw text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_ids uuid[];
  v_order payment_orders;
  v_raw text := left(coalesce(p_raw, ''), 500);
begin
  if p_key is null or not exists (
    select 1 from payment_gateway_keys where key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex')
  ) then
    raise exception 'invalid_key';
  end if;
  if (select count(*) from payment_events where received_at > now() - interval '1 minute') >= 60 then
    raise exception 'rate_limited';
  end if;

  if p_amount is null or p_amount <= 0 then
    insert into payment_events (amount_idr, raw_text, result) values (p_amount, v_raw, 'no_amount');
    return jsonb_build_object('result', 'no_amount');
  end if;

  perform expire_stale_orders();
  select array_agg(id) into v_ids
    from payment_orders
   where amount_idr = p_amount
     and status in ('pending', 'claimed', 'expired')
     and created_at > now() - interval '48 hours';

  if coalesce(array_length(v_ids, 1), 0) = 1 then
    v_order := approve_order_internal(v_ids[1], null);
    insert into payment_events (amount_idr, raw_text, result, order_id) values (p_amount, v_raw, 'approved', v_order.id);
    return jsonb_build_object('result', 'approved', 'order_code', v_order.order_code);
  elsif coalesce(array_length(v_ids, 1), 0) = 0 then
    insert into payment_events (amount_idr, raw_text, result) values (p_amount, v_raw, 'unmatched');
    return jsonb_build_object('result', 'unmatched');
  else
    insert into payment_events (amount_idr, raw_text, result) values (p_amount, v_raw, 'ambiguous');
    return jsonb_build_object('result', 'ambiguous');
  end if;
end;
$$;
revoke all on function public.gateway_payment_received(text, int, text) from public;
grant execute on function public.gateway_payment_received(text, int, text) to anon, authenticated;

create or replace function public.admin_gateway_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'configured', exists (select 1 from payment_gateway_keys),
    'key_created_at', (select created_at from payment_gateway_keys where id = 1),
    'last_event_at', (select max(received_at) from payment_events),
    'events', coalesce((
      select jsonb_agg(e order by e.received_at desc) from (
        select pe.received_at, pe.amount_idr, pe.result, left(pe.raw_text, 160) as raw_text, po.order_code
          from payment_events pe left join payment_orders po on po.id = pe.order_id
         order by pe.received_at desc limit 20
      ) e
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.admin_gateway_status() from public, anon;
grant execute on function public.admin_gateway_status() to authenticated;
