-- ============================================================================
-- Ketahanan saat banyak pembeli bersamaan (mis. 100 donasi dalam satu menit).
--
-- 1. Nominal pesanan terbuka dijamin unik oleh indeks unik parsial. Dua pesanan yang dibuat pada
--    milidetik yang sama tidak bisa lagi mendapat kode unik yang sama: yang kalah mencoba kode berikutnya.
-- 2. Batas notifikasi HP dinaikkan dari 60 ke 600 per menit, supaya lonjakan pembayaran tidak ditolak.
-- Idempoten.
-- ============================================================================

create unique index if not exists payment_orders_open_amount_uidx
  on public.payment_orders (amount_idr)
  where status in ('pending', 'claimed');

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
  v_try int := 0;
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
      insert into payment_orders (order_code, user_id, tier_code, period_months, base_price_idr, unique_code, amount_idr)
      values (
        'SQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
        v_uid, v_tier, 0, p_amount, v_code, p_amount - v_code
      )
      returning * into v_order;
      return v_order;
    exception when unique_violation then
      -- Kode yang sama baru saja diambil pesanan lain yang dibuat bersamaan; coba kode berikutnya.
      if v_try >= 20 then raise exception 'no_unique_code'; end if;
    end;
  end loop;
end;
$$;
revoke all on function public.create_payment_order(text, int) from public, anon;
grant execute on function public.create_payment_order(text, int) to authenticated;

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
  if (select count(*) from payment_events where received_at > now() - interval '1 minute') >= 600 then
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
    begin
      v_order := approve_order_internal(v_ids[1], null);
    exception when others then
      -- Notifikasi ganda (GoPay + GoPay Merchant) yang tiba bersamaan: pesanan sudah disetujui oleh yang pertama.
      insert into payment_events (amount_idr, raw_text, result, order_id) values (p_amount, v_raw, 'unmatched', v_ids[1]);
      return jsonb_build_object('result', 'unmatched');
    end;
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
