-- ============================================================================
-- Kode unik pembayaran dibulatkan KE ATAS: nominal transfer = harga + kode (17.000 -> 17.001, 17.002, ...),
-- bukan harga - kode. Donasi yang dicatat tetap base_price_idr; verifikasi otomatis mencocokkan amount_idr.
-- Pesanan terbuka yang dibuat sebelum migrasi ini tetap memakai nominal lamanya.
-- Idempoten.
-- ============================================================================

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
      where o.amount_idr = p_amount + c
        and (o.status in ('pending', 'claimed') or (o.status = 'expired' and o.created_at > now() - interval '48 hours'))
    )
    order by c limit 1;
    if v_code is null then raise exception 'no_unique_code'; end if;

    begin
      insert into payment_orders (order_code, user_id, tier_code, period_months, base_price_idr, unique_code, amount_idr, as_gift)
      values (
        'SQ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
        v_uid, v_tier, v_period, p_amount, v_code, p_amount + v_code, v_gift
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
