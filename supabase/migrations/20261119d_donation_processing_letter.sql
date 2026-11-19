-- ============================================================================
-- Surat "pengajuan sedang diproses" di Kotak Pos (selalu otomatis).
--   Dikirim saat pemain mengajukan klaim pembayaran (submit_payment_claim), satu kali per pesanan.
--   Surat biasa tanpa kotak hadiah; surat hadiah menyusul setelah pembayaran terverifikasi.
--   Penanda: letters.gift_order_id = pesanan dan gift is null.
-- Idempoten.
-- ============================================================================

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
              else 'donasi'
            end || case when coalesce(p_as_gift, false) then ' (hadiah)' else '' end;

  insert into letters (
    sender_id, from_admin, is_anonymous, sender_name, sender_address, recipient_id, to_admin,
    subject, body, category, stationery, priority, gift, gift_order_id
  ) values (
    null, true, false, 'Admin SevnQuest', 'SQ-PUSAT', p_user, false,
    left('Pengajuan donasimu sedang diproses (' || coalesce(p_order_code, '-') || ')', 120),
    'Halo ' || v_name || E',\n\n'
      || 'Pengajuan ' || v_plan || ' sebesar ' || fmt_idr(p_amount) || ' dengan kode ' || coalesce(p_order_code, '-')
      || E' sudah kami terima dan sedang diproses.\n\n'
      || 'Sebagian besar pembayaran terverifikasi otomatis dalam beberapa menit. Bila belum, admin akan memeriksanya secara '
      || 'manual paling lambat 1 x 24 jam. Setelah terverifikasi, surat terima kasih berisi kotak hadiah akan datang ke kotak '
      || E'pos ini, lengkap dengan rincian fitur yang kamu dapat.\n\n'
      || 'Ada kendala? Balas surat ini dan sebutkan kode pesananmu.',
    'donation', 'classic', 0, null, p_order
  )
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.mail_send_processing_letter(uuid, uuid, text, text, int, boolean) from public, anon, authenticated;

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
