-- ============================================================================
-- letter_tiers: batas surat harian, prioritas, dan kertas surat eksklusif per tier.
--
-- Tier Kotak Pos diturunkan dari sistem langganan/donasi yang sudah ada (public.entitlement_for):
--   rank 0  Free            : access_tier = 'basic'
--   rank 1  Premium         : access_tier = 'full' (donasi bulanan / setoran lifetime)
--   rank 2..8 Super Premium Lv.1..7 : badge donatur 1..7 (Sakura, Ume, Take, Matsu, Tsuki, Taiyou, Fuji);
--                             badge 8 (Eien, lifetime penuh) diperlakukan sebagai Lv.7.
--   Admin: tanpa batas, semua kertas.
--
-- Semua angka ada di public.mail_plan_for(); ubah di sana bila kebijakan berubah.
-- Hari dihitung per tanggal WIB (Asia/Jakarta), sama seperti kuota AI.
-- Kertas surat: tiap tier membuka kertasnya sendiri + semua kertas tier di bawahnya; divalidasi di server.
--
-- Bergantung pada public.letters (20261107b_letters.sql), public.entitlement_for(), public.is_admin().
-- STATUS: DITERAPKAN 2026-11-07 ke proyek iokhdhqnpslpwsxspvaj atas persetujuan pemilik,
-- tercatat di supabase_migrations.schema_migrations sebagai 20261107011729_letter_tiers. Diverifikasi: anon tanpa
-- akses RPC; fungsi internal mail_plan_for / mail_sent_today / mail_paper_rank tidak bisa dipanggil klien;
-- authenticated bisa membaca priority tetapi tetap tidak bisa membaca sender_id; paket admin = tanpa batas.
-- File ini idempoten; aman dijalankan ulang.
-- ============================================================================

-- --------------------------------------------------------------------------- Kolom baru

alter table public.letters add column if not exists priority integer not null default 0;
alter table public.letters add column if not exists sender_tier text;

alter table public.letters drop constraint if exists letters_stationery_check;
alter table public.letters add constraint letters_stationery_check check (stationery in (
  'classic', 'sakura', 'night',                                   -- Free
  'kilat',                                                        -- Premium
  'hanami', 'ume', 'take', 'matsu', 'tsuki', 'taiyou', 'fuji'     -- Super Premium Lv.1..7
));

alter table public.letters drop constraint if exists letters_priority_check;
alter table public.letters add constraint letters_priority_check check (priority between 0 and 9);

grant select (priority, sender_tier) on public.letters to authenticated;

create index if not exists letters_sender_day_idx on public.letters (sender_id, sent_at desc) where not from_admin;

-- --------------------------------------------------------------------------- Kebijakan

-- Rank minimal untuk memakai sebuah kertas (null = kertas tidak dikenal).
create or replace function public.mail_paper_rank(p_paper text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_paper
    when 'classic' then 0 when 'sakura' then 0 when 'night' then 0
    when 'kilat' then 1
    when 'hanami' then 2 when 'ume' then 3 when 'take' then 4 when 'matsu' then 5
    when 'tsuki' then 6 when 'taiyou' then 7 when 'fuji' then 8
  end;
$$;

-- Paket Kotak Pos seorang pengguna: tier, batas harian, prioritas.
create or replace function public.mail_plan_for(p_uid uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ent    jsonb;
  v_badge  int;
  v_rank   int := 0;
  v_titles constant text[] := array['Sakura', 'Ume', 'Take', 'Matsu', 'Tsuki', 'Taiyou', 'Fuji'];
  -- indeks = rank + 1
  v_limits constant int[] := array[3, 6, 8, 10, 12, 15, 18, 22, 30];
  v_label  text;
begin
  if exists (select 1 from public.admins where user_id = p_uid) then
    return jsonb_build_object('tier', 'admin', 'rank', 9, 'label', 'Admin', 'daily_limit', null, 'priority', 9);
  end if;

  v_ent := public.entitlement_for(p_uid);
  v_badge := least(coalesce((v_ent->>'badge_level')::int, 0), 7);
  if v_badge >= 1 then
    v_rank := 1 + v_badge;
  elsif v_ent->>'access_tier' = 'full' then
    v_rank := 1;
  end if;

  v_label := case
    when v_rank = 0 then 'Free'
    when v_rank = 1 then 'Premium'
    else 'Super Premium Lv.' || (v_rank - 1) || ' · ' || v_titles[v_rank - 1]
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

-- Jumlah surat yang dikirim pemain hari ini (tanggal WIB).
create or replace function public.mail_sent_today(p_uid uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.letters
   where sender_id = p_uid and not from_admin
     and sent_at >= ((now() at time zone 'Asia/Jakarta')::date)::timestamp at time zone 'Asia/Jakarta';
$$;

revoke all on function public.mail_paper_rank(text) from public, anon, authenticated;
revoke all on function public.mail_plan_for(uuid) from public, anon, authenticated;
revoke all on function public.mail_sent_today(uuid) from public, anon, authenticated;

-- --------------------------------------------------------------------------- RPC (diperbarui)

-- Status kotak pos + paket tier pemain.
drop function if exists public.my_mail_status();
create function public.my_mail_status()
returns table (
  address text, unread integer, admin_unread integer, am_admin boolean,
  tier text, tier_rank integer, tier_label text, daily_limit integer, sent_today integer, priority integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_admin boolean;
  v_plan  jsonb;
begin
  if v_uid is null then
    raise exception 'Harus login untuk membuka kotak pos.' using errcode = '42501';
  end if;
  v_admin := coalesce(public.is_admin(), false);
  v_plan := public.mail_plan_for(v_uid);
  return query
  select
    public.mail_ensure_mailbox(v_uid),
    (select count(*)::int from public.letters l
      where l.recipient_id = v_uid and l.read_at is null and not l.archived_by_recipient),
    case when v_admin then
      (select count(*)::int from public.letters l
        where l.to_admin and l.read_at is null and not l.archived_by_recipient)
    else 0 end,
    v_admin,
    v_plan->>'tier',
    (v_plan->>'rank')::int,
    v_plan->>'label',
    (v_plan->>'daily_limit')::int,
    public.mail_sent_today(v_uid),
    (v_plan->>'priority')::int;
end;
$$;

-- Pemain mengirim surat ke admin: batas harian & kertas sesuai tier, prioritas dicatat.
create or replace function public.send_letter(
  p_subject     text,
  p_body        text,
  p_category    text default 'general',
  p_stationery  text default 'classic',
  p_anonymous   boolean default false,
  p_sender_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_plan  jsonb;
  v_rank  int;
  v_limit int;
  v_paper text := coalesce(nullif(p_stationery, ''), 'classic');
  v_need  int;
  v_addr  text;
  v_id    uuid;
begin
  if v_uid is null then
    raise exception 'Harus login untuk mengirim surat.' using errcode = '42501';
  end if;

  -- Satu surat sekaligus per pemain (mencegah dua kiriman bersamaan melewati batas).
  perform pg_advisory_xact_lock(hashtextextended('send_letter:' || v_uid::text, 0));

  v_plan := public.mail_plan_for(v_uid);
  v_rank := (v_plan->>'rank')::int;
  v_limit := (v_plan->>'daily_limit')::int;

  if v_limit is not null and public.mail_sent_today(v_uid) >= v_limit then
    raise exception 'Batas % surat per hari untuk tier % sudah tercapai. Coba lagi besok.', v_limit, v_plan->>'label'
      using errcode = 'P0001';
  end if;

  v_need := public.mail_paper_rank(v_paper);
  if v_need is null then
    raise exception 'Kertas surat tidak dikenal.' using errcode = '22023';
  end if;
  if v_need > v_rank then
    raise exception 'Kertas ini khusus untuk tier yang lebih tinggi.' using errcode = 'P0001';
  end if;

  v_addr := public.mail_ensure_mailbox(v_uid);

  insert into public.letters (
    sender_id, from_admin, is_anonymous, sender_name, sender_address, to_admin,
    subject, body, category, stationery, priority, sender_tier
  ) values (
    v_uid, false, coalesce(p_anonymous, false),
    case when coalesce(p_anonymous, false) then null else nullif(left(btrim(coalesce(p_sender_name, '')), 60), '') end,
    case when coalesce(p_anonymous, false) then null else v_addr end,
    true,
    btrim(p_subject), btrim(p_body),
    coalesce(nullif(p_category, ''), 'general'),
    v_paper,
    least((v_plan->>'priority')::int, 9),
    v_plan->>'label'
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Kotak pos admin: + prioritas & tier pengirim, urut prioritas lalu terbaru. TANPA sender_id.
drop function if exists public.admin_list_letters();
create function public.admin_list_letters()
returns table (
  id uuid, is_anonymous boolean, sender_name text, sender_address text, subject text, body text,
  category text, stationery text, sent_at timestamptz, read_at timestamptz, replied_at timestamptz,
  archived boolean, priority integer, sender_tier text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'Akses ditolak: akun ini bukan admin.' using errcode = '42501';
  end if;
  return query
  select l.id, l.is_anonymous, l.sender_name, l.sender_address, l.subject, l.body,
         l.category, l.stationery, l.sent_at, l.read_at, l.replied_at, l.archived_by_recipient,
         l.priority, l.sender_tier
    from public.letters l
   where l.to_admin
   order by l.priority desc, l.sent_at desc
   limit 300;
end;
$$;

revoke all on function public.my_mail_status() from public, anon;
revoke all on function public.send_letter(text, text, text, text, boolean, text) from public, anon;
revoke all on function public.admin_list_letters() from public, anon;
grant execute on function public.my_mail_status() to authenticated;
grant execute on function public.send_letter(text, text, text, text, boolean, text) to authenticated;
grant execute on function public.admin_list_letters() to authenticated;
