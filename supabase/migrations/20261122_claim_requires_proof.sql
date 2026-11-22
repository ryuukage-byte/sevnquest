-- ============================================================================
-- Klaim "sudah bayar" wajib melampirkan screenshot bukti bayar.
--   Banyak klaim dikirim sebelum pembeli benar-benar membayar. Klien kini baru menawarkan formulir lapor
--   5 menit setelah pesanan dibuat; server menolak klaim tanpa bukti (proof_required).
-- Idempoten.
-- ============================================================================

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
  -- Bukti bayar wajib (baru atau yang sudah terunggah sebelumnya) agar tidak ada klaim sebelum benar-benar membayar.
  if p_proof_path is null and not exists (
    select 1 from payment_orders where id = p_order_id and user_id = auth.uid() and proof_path is not null
  ) then
    raise exception 'proof_required';
  end if;
  update payment_orders
     set status = 'claimed',
         paid_at_reported = coalesce(p_paid_at, now()),
         proof_path = coalesce(p_proof_path, proof_path)
   where id = p_order_id and user_id = auth.uid() and status in ('pending', 'claimed', 'expired')
  returning * into v_order;
  if v_order.id is null then raise exception 'order_not_claimable'; end if;

  -- Surat tidak boleh menggagalkan klaim.
  begin
    perform mail_send_processing_letter(
      v_order.user_id, v_order.id, v_order.order_code, v_order.tier_code, v_order.amount_idr, v_order.as_gift
    );
  exception when others then
    raise warning 'processing letter failed for order %: %', v_order.id, sqlerrm;
  end;
  return v_order;
end;
$$;
