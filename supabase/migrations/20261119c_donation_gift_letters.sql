-- ============================================================================
-- Surat hadiah donasi di Kotak Pos.
--   Setiap pembayaran yang disetujui (verifikasi otomatis maupun manual admin) mengirim satu surat dari
--   Admin SevnQuest ke kotak pos donatur, berisi "kotak hadiah" (kolom gift). Pemain mengambil surat itu,
--   membuka kotak hadiahnya, lalu melihat rincian fitur yang didapat.
--   * Verifikasi otomatis: isi surat = templat terima kasih sesuai jenis & nominal donasi.
--   * Persetujuan manual: admin boleh menulis pesan pribadi (p_note); bila kosong dipakai templat.
--   * Pesanan hadiah (as_gift): surat ke pembeli berisi key; saat key ditukar, penukar juga mendapat surat hadiah.
-- Idempoten.
-- ============================================================================

alter table public.letters add column if not exists gift jsonb;
alter table public.letters add column if not exists gift_opened_at timestamptz;
alter table public.letters add column if not exists gift_order_id uuid references public.payment_orders (id) on delete set null;

alter table public.letters drop constraint if exists letters_category_check;
alter table public.letters add constraint letters_category_check check (category in (
  'general', 'bug', 'account', 'suggestion', 'thanks', 'donation'
));

grant select (gift, gift_opened_at) on public.letters to authenticated;

-- Format rupiah: 102000 -> "Rp 102.000".
create or replace function public.fmt_idr(p_amount int) returns text
language sql immutable set search_path = public as $$
  select 'Rp ' || replace(to_char(coalesce(p_amount, 0), 'FM999,999,999,999'), ',', '.');
$$;

-- Kirim surat hadiah untuk satu donasi. p_recipient = penerima surat, p_key = key hadiah (hanya pesanan hadiah).
create or replace function public.mail_send_donation_letter(
  p_recipient uuid, p_kind text, p_amount int, p_order uuid, p_auto boolean, p_note text, p_key text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_ent     jsonb;
  v_name    text;
  v_subject text;
  v_body    text;
  v_paper   text;
  v_gift    jsonb;
  v_id      uuid;
  v_tier    int;
  v_note    text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_recipient is null then return null; end if;
  perform mail_ensure_mailbox(p_recipient);
  v_ent := entitlement_for(p_recipient);
  select coalesce(nullif(btrim(player_name), ''), 'Petualang') into v_name from leaderboard where user_id = p_recipient::text;
  v_name := coalesce(v_name, 'Petualang');
  v_tier := coalesce((v_ent->>'month_tier')::int, 0);

  if p_key is not null then
    v_paper := 'sakura';
    v_subject := 'Key hadiahmu sudah siap';
    v_body := 'Halo ' || v_name || E',\n\n'
      || 'Pembayaran ' || fmt_idr(p_amount) || ' untuk hadiah sudah kami terima. Terima kasih sudah mengajak orang lain belajar '
      || E'bersama SevnQuest.\n\nKey hadiahnya ada di dalam kotak ini. Berikan kepada penerima; ia menukarnya di Pengaturan, '
      || E'menu Tukar Key. Satu key hanya bisa dipakai satu kali.';
  elsif p_kind = 'monthly' then
    v_paper := 'kilat';
    v_subject := case when v_tier > 0 then 'Terima kasih! Tingkat ' || v_tier || ' bulan ini terbuka' else 'Terima kasih atas donasimu' end;
    v_body := 'Halo ' || v_name || E',\n\n'
      || 'Donasi bulananmu sebesar ' || fmt_idr(p_amount) || ' sudah kami terima'
      || case when p_auto then ' dan terverifikasi otomatis' else '' end || '. '
      || case when v_tier > 0
              then 'Total donasimu bulan ini mencapai Tingkat ' || v_tier || '. '
              else 'Donasimu bulan ini belum mencapai Tingkat 1 (Rp 17.000), tetapi sudah tercatat dan akan dijumlahkan. ' end
      || E'Setiap rupiah membantu SevnQuest tetap hidup dan terus bertambah materi.\n\n'
      || 'Buka kotak hadiah di surat ini untuk melihat fitur yang kamu dapat.';
  elsif p_kind = 'yearly' then
    v_paper := 'matsu';
    v_subject := 'Selamat datang di Hall of Fame!';
    v_body := 'Halo ' || v_name || E',\n\n'
      || 'Paket Tahunanmu (' || fmt_idr(p_amount) || ') sudah kami terima'
      || case when p_auto then ' dan terverifikasi otomatis' else '' end || '. '
      || E'Terima kasih sudah percaya pada SevnQuest untuk satu tahun penuh.\n\n'
      || 'Namamu kini ada di Hall of Fame papan donatur, di urutan teratas. Kami akan berusaha agar fitur yang kamu butuhkan '
      || E'selalu tersedia selama SevnQuest masih hidup.\n\nBuka kotak hadiah di surat ini untuk melihat semua yang kamu dapat.';
  else
    v_paper := 'fuji';
    v_subject := case when coalesce((v_ent->>'is_lifetime')::boolean, false)
                      then 'Kamu kini Lifetime: Full selamanya' else 'Terima kasih atas setoran lifetime-mu' end;
    v_body := 'Halo ' || v_name || E',\n\n'
      || 'Setoran lifetime ' || fmt_idr(p_amount) || ' sudah kami terima'
      || case when p_auto then ' dan terverifikasi otomatis' else '' end || '. '
      || 'Tabungan lifetime-mu sekarang ' || fmt_idr(coalesce((v_ent->>'lifetime_total')::int, 0)) || ' dari ' || fmt_idr(700000) || E'.\n\n'
      || case when coalesce((v_ent->>'is_lifetime')::boolean, false)
              then E'Akses Full-mu kini berlaku selamanya dan namamu tercatat di Hall of Fame. Terima kasih sebesar-besarnya.\n\n'
              else '' end
      || 'Buka kotak hadiah di surat ini untuk melihat fitur yang kamu dapat.';
  end if;

  if v_note is not null then
    v_body := 'Halo ' || v_name || E',\n\n' || left(v_note, 4000);
  end if;
  v_body := v_body || E'\n\nPunya ide fitur atau materi yang kamu butuhkan? Balas surat ini atau tulis surat dengan kategori Saran; '
    || 'surat donatur dibaca lebih dulu.';

  v_gift := jsonb_build_object(
    'kind', case when p_key is not null then 'gift_key' else p_kind end,
    'amount', p_amount,
    'auto', coalesce(p_auto, false),
    'key', p_key,
    'month_tier', v_tier,
    'access_expires_at', v_ent->'access_expires_at',
    'is_lifetime', coalesce((v_ent->>'is_lifetime')::boolean, false),
    'lifetime_total', coalesce((v_ent->>'lifetime_total')::int, 0),
    'badge_level', coalesce((v_ent->>'badge_level')::int, 0),
    'badge_title', v_ent->>'badge_title'
  );

  insert into letters (
    sender_id, from_admin, is_anonymous, sender_name, sender_address, recipient_id, to_admin,
    subject, body, category, stationery, priority, gift, gift_order_id
  ) values (
    null, true, false, 'Admin SevnQuest', 'SQ-PUSAT', p_recipient, false,
    left(v_subject, 120), left(v_body, 5000), 'donation', v_paper, 0, v_gift, p_order
  )
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.mail_send_donation_letter(uuid, text, int, uuid, boolean, text, text) from public, anon, authenticated;

-- Persetujuan pesanan: kini menerima catatan admin dan selalu mengirim surat hadiah.
drop function if exists public.approve_payment(uuid);
drop function if exists public.approve_order_internal(uuid, uuid);
create or replace function public.approve_order_internal(p_order_id uuid, p_verifier uuid, p_note text default null)
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

create or replace function public.approve_payment(p_order_id uuid, p_note text default null)
returns public.payment_orders
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return approve_order_internal(p_order_id, auth.uid(), p_note);
end;
$$;
revoke all on function public.approve_payment(uuid, text) from public, anon;
grant execute on function public.approve_payment(uuid, text) to authenticated;

-- Tukar key: penukar ikut mendapat surat hadiah.
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
  begin
    perform mail_send_donation_letter(v_uid, v_key.kind, v_key.amount_idr, v_key.order_id, true, null, null);
  exception when others then
    raise warning 'donation letter failed for key %: %', v_code, sqlerrm;
  end;
  return jsonb_build_object('code', v_code, 'kind', v_key.kind, 'amount_idr', v_key.amount_idr);
end;
$$;

-- Pemain membuka kotak hadiah di suratnya.
create or replace function public.open_gift_letter(p_letter_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Harus login.' using errcode = '42501'; end if;
  update letters
     set gift_opened_at = coalesce(gift_opened_at, now()), read_at = coalesce(read_at, now())
   where id = p_letter_id and recipient_id = auth.uid() and gift is not null;
end;
$$;
revoke all on function public.open_gift_letter(uuid) from public, anon;
grant execute on function public.open_gift_letter(uuid) to authenticated;
