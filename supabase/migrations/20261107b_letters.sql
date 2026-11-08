-- ============================================================================
-- letters: Kotak Pos — surat-menyurat antara pemain dan admin (menggantikan 20261107_messages).
--
-- Model "kantor pos", bukan chat:
--   mailboxes = kotak pos tiap pemain, dengan alamat unik (mis. SQ-K7MP-2Q4X). Dibuat otomatis.
--   letters   = satu surat utuh (perihal, isi, kertas, pengirim, penerima). Balasan admin adalah surat baru
--               (reply_to menunjuk surat asal) yang dikirim ke kotak pos pengirim.
-- Untuk saat ini pemain hanya bisa mengirim ke admin ("Kantor Pos Pusat", alamat SQ-PUSAT).
--
-- Anonim: pengirim boleh menyembunyikan nama & alamat. Admin tidak pernah melihat sender_id
-- (kolom itu tidak diberikan ke authenticated; kotak pos admin dibaca lewat RPC), tetapi balasan admin
-- tetap sampai ke kotak pos pengirim karena server yang mengantar.
--
-- Keamanan:
-- - Pemain hanya membaca surat yang ia kirim atau yang dialamatkan kepadanya (RLS), tanpa kolom sender_id.
-- - Semua penulisan lewat RPC security definer. Batas: 10 surat per 24 jam per pemain (admin bebas).
-- - Tamu (anon) tidak punya akses.
--
-- Data uji dari message_threads/messages dipindahkan ke letters, lalu tabel & fungsi lama dihapus.
-- Bergantung pada public.is_admin().
-- STATUS: DITERAPKAN 2026-11-06 ke proyek iokhdhqnpslpwsxspvaj atas persetujuan pemilik,
-- tercatat di supabase_migrations.schema_migrations sebagai 20261106145934_letters. Diverifikasi: 1 surat uji
-- dipindahkan, tabel lama terhapus, RLS aktif, anon tanpa akses, authenticated tidak bisa membaca sender_id
-- maupun INSERT langsung, fungsi internal mail_* tidak bisa dipanggil klien.
-- File ini idempoten; aman dijalankan ulang.
-- ============================================================================

-- --------------------------------------------------------------------------- Kotak pos

create table if not exists public.mailboxes (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  address    text        not null unique check (address ~ '^SQ-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  created_at timestamptz not null default now()
);

comment on table public.mailboxes is 'Kotak pos pemain + alamatnya. Dibuat lewat RPC.';

alter table public.mailboxes enable row level security;

drop policy if exists mailboxes_read_own on public.mailboxes;
create policy mailboxes_read_own on public.mailboxes
  for select to authenticated
  using (user_id = auth.uid());

revoke all on public.mailboxes from anon, authenticated;
grant select on public.mailboxes to authenticated;

-- Alamat acak: SQ-XXXX-XXXX tanpa karakter yang mirip (0/O, 1/I).
create or replace function public.mail_new_address()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v text;
  i int;
begin
  loop
    v := 'SQ-';
    for i in 1..8 loop
      v := v || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      if i = 4 then v := v || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.mailboxes where address = v);
  end loop;
  return v;
end;
$$;

-- Kotak pos pengguna (dibuat bila belum ada). Internal; tidak dapat dipanggil klien langsung.
create or replace function public.mail_ensure_mailbox(p_uid uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v text;
begin
  select address into v from public.mailboxes where user_id = p_uid;
  if v is null then
    insert into public.mailboxes (user_id, address) values (p_uid, public.mail_new_address())
    on conflict (user_id) do nothing;
    select address into v from public.mailboxes where user_id = p_uid;
  end if;
  return v;
end;
$$;

revoke all on function public.mail_new_address() from public, anon, authenticated;
revoke all on function public.mail_ensure_mailbox(uuid) from public, anon, authenticated;

-- --------------------------------------------------------------------------- Surat

create table if not exists public.letters (
  id                    uuid        primary key default gen_random_uuid(),
  sender_id             uuid        references auth.users (id) on delete set null,
  from_admin            boolean     not null default false,
  is_anonymous          boolean     not null default false,
  sender_name           text        check (sender_name is null or char_length(sender_name) <= 60),
  sender_address        text        check (sender_address is null or char_length(sender_address) <= 20),
  recipient_id          uuid        references auth.users (id) on delete cascade,
  to_admin              boolean     not null default false,
  subject               text        not null check (char_length(btrim(subject)) between 1 and 120),
  body                  text        not null check (char_length(btrim(body)) between 1 and 5000),
  category              text        not null default 'general'
                                    check (category in ('general', 'bug', 'account', 'suggestion', 'thanks')),
  stationery            text        not null default 'classic' check (stationery in ('classic', 'sakura', 'night')),
  reply_to              uuid        references public.letters (id) on delete set null,
  sent_at               timestamptz not null default now(),
  read_at               timestamptz,
  replied_at            timestamptz,
  archived_by_recipient boolean     not null default false,
  archived_by_sender    boolean     not null default false,
  constraint letters_destination check (
    (to_admin and recipient_id is null) or (not to_admin and recipient_id is not null)
  )
);

comment on table public.letters is 'Surat Kotak Pos. Tulis hanya lewat RPC; sender_id tidak pernah dibaca klien.';

create index if not exists letters_recipient_idx on public.letters (recipient_id, sent_at desc);
create index if not exists letters_sender_idx on public.letters (sender_id, sent_at desc);
create index if not exists letters_admin_box_idx on public.letters (sent_at desc) where to_admin;

alter table public.letters enable row level security;

drop policy if exists letters_read_own on public.letters;
create policy letters_read_own on public.letters
  for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

revoke all on public.letters from anon, authenticated;
-- Hak kolom: semua kecuali sender_id (agar surat anonim tidak bisa dilacak lewat API).
grant select (
  id, from_admin, is_anonymous, sender_name, sender_address, recipient_id, to_admin, subject, body, category,
  stationery, reply_to, sent_at, read_at, replied_at, archived_by_recipient, archived_by_sender
) on public.letters to authenticated;

-- --------------------------------------------------------------------------- RPC

-- Status kotak pos untuk kartu dashboard: alamat (dibuat bila belum ada) + jumlah belum dibaca.
create or replace function public.my_mail_status()
returns table (address text, unread integer, admin_unread integer, am_admin boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_admin boolean;
begin
  if v_uid is null then
    raise exception 'Harus login untuk membuka kotak pos.' using errcode = '42501';
  end if;
  v_admin := coalesce(public.is_admin(), false);
  return query
  select
    public.mail_ensure_mailbox(v_uid),
    (select count(*)::int from public.letters l
      where l.recipient_id = v_uid and l.read_at is null and not l.archived_by_recipient),
    case when v_admin then
      (select count(*)::int from public.letters l
        where l.to_admin and l.read_at is null and not l.archived_by_recipient)
    else 0 end,
    v_admin;
end;
$$;

-- Pemain mengirim surat ke admin. Mengembalikan id surat.
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
  v_uid  uuid := auth.uid();
  v_addr text;
  v_id   uuid;
begin
  if v_uid is null then
    raise exception 'Harus login untuk mengirim surat.' using errcode = '42501';
  end if;
  if not coalesce(public.is_admin(), false) and (
    select count(*) from public.letters
     where sender_id = v_uid and not from_admin and sent_at > now() - interval '24 hours'
  ) >= 10 then
    raise exception 'Kamu sudah mengirim 10 surat hari ini. Coba lagi besok.' using errcode = 'P0001';
  end if;

  v_addr := public.mail_ensure_mailbox(v_uid);

  insert into public.letters (
    sender_id, from_admin, is_anonymous, sender_name, sender_address, to_admin,
    subject, body, category, stationery
  ) values (
    v_uid, false, coalesce(p_anonymous, false),
    case when coalesce(p_anonymous, false) then null else nullif(left(btrim(coalesce(p_sender_name, '')), 60), '') end,
    case when coalesce(p_anonymous, false) then null else v_addr end,
    true,
    btrim(p_subject), btrim(p_body),
    coalesce(nullif(p_category, ''), 'general'),
    coalesce(nullif(p_stationery, ''), 'classic')
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Admin membalas surat: surat baru dikirim ke kotak pos pengirim asli (juga bila anonim).
create or replace function public.admin_reply_letter(
  p_letter_id  uuid,
  p_subject    text,
  p_body       text,
  p_stationery text default 'classic'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_target uuid;
  v_cat    text;
  v_id     uuid;
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'Akses ditolak: akun ini bukan admin.' using errcode = '42501';
  end if;
  select sender_id, category into v_target, v_cat from public.letters where id = p_letter_id and to_admin;
  if not found then
    raise exception 'Surat tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_target is null then
    raise exception 'Pengirim surat ini sudah tidak memiliki akun; balasan tidak bisa diantar.' using errcode = 'P0001';
  end if;

  insert into public.letters (
    sender_id, from_admin, is_anonymous, sender_name, sender_address, recipient_id, to_admin,
    subject, body, category, stationery, reply_to
  ) values (
    v_uid, true, false, 'Admin SevnQuest', 'SQ-PUSAT', v_target, false,
    btrim(p_subject), btrim(p_body), v_cat, coalesce(nullif(p_stationery, ''), 'classic'), p_letter_id
  )
  returning id into v_id;

  update public.letters
     set replied_at = now(), read_at = coalesce(read_at, now())
   where id = p_letter_id;

  return v_id;
end;
$$;

-- Kotak pos admin: surat untuk admin, TANPA sender_id.
create or replace function public.admin_list_letters()
returns table (
  id uuid, is_anonymous boolean, sender_name text, sender_address text, subject text, body text,
  category text, stationery text, sent_at timestamptz, read_at timestamptz, replied_at timestamptz,
  archived boolean
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
         l.category, l.stationery, l.sent_at, l.read_at, l.replied_at, l.archived_by_recipient
    from public.letters l
   where l.to_admin
   order by l.sent_at desc
   limit 300;
end;
$$;

-- Tandai surat sudah dibaca oleh penerimanya (pemain, atau admin untuk kotak pos admin).
create or replace function public.mark_letter_read(p_letter_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  update public.letters
     set read_at = now()
   where id = p_letter_id
     and read_at is null
     and (recipient_id = v_uid or (to_admin and coalesce(public.is_admin(), false)));
end;
$$;

-- Simpan ke arsip / keluarkan dari arsip (sisi penerima, pengirim, atau admin).
create or replace function public.archive_letter(p_letter_id uuid, p_archived boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  update public.letters
     set archived_by_recipient = p_archived
   where id = p_letter_id
     and (recipient_id = v_uid or (to_admin and coalesce(public.is_admin(), false)));
  update public.letters
     set archived_by_sender = p_archived
   where id = p_letter_id and sender_id = v_uid;
end;
$$;

revoke all on function public.my_mail_status() from public, anon;
revoke all on function public.send_letter(text, text, text, text, boolean, text) from public, anon;
revoke all on function public.admin_reply_letter(uuid, text, text, text) from public, anon;
revoke all on function public.admin_list_letters() from public, anon;
revoke all on function public.mark_letter_read(uuid) from public, anon;
revoke all on function public.archive_letter(uuid, boolean) from public, anon;
grant execute on function public.my_mail_status() to authenticated;
grant execute on function public.send_letter(text, text, text, text, boolean, text) to authenticated;
grant execute on function public.admin_reply_letter(uuid, text, text, text) to authenticated;
grant execute on function public.admin_list_letters() to authenticated;
grant execute on function public.mark_letter_read(uuid) to authenticated;
grant execute on function public.archive_letter(uuid, boolean) to authenticated;

-- --------------------------------------------------------------------------- Pindahkan data lama

do $$
declare
  r record;
begin
  if to_regclass('public.messages') is null or to_regclass('public.message_threads') is null then
    return;
  end if;
  if exists (select 1 from public.letters) then
    return; -- sudah dipindahkan
  end if;
  for r in
    select m.sender_id, m.from_admin, m.body, m.created_at,
           t.user_id, t.user_name, t.subject, t.category, t.admin_unread, t.user_unread
      from public.messages m join public.message_threads t on t.id = m.thread_id
     order by m.created_at
  loop
    if r.from_admin then
      insert into public.letters (sender_id, from_admin, sender_name, sender_address, recipient_id, to_admin,
                                  subject, body, category, sent_at, read_at)
      values (r.sender_id, true, 'Admin SevnQuest', 'SQ-PUSAT', r.user_id, false,
              left('Balasan: ' || r.subject, 120), r.body, r.category, r.created_at,
              case when r.user_unread = 0 then r.created_at end);
    else
      insert into public.letters (sender_id, from_admin, sender_name, sender_address, to_admin,
                                  subject, body, category, sent_at, read_at)
      values (r.user_id, false, r.user_name, public.mail_ensure_mailbox(r.user_id), true,
              r.subject, r.body, r.category, r.created_at,
              case when r.admin_unread = 0 then r.created_at end);
    end if;
  end loop;
end;
$$;

drop function if exists public.create_message_thread(text, text, text, text);
drop function if exists public.send_thread_message(uuid, text);
drop function if exists public.mark_message_thread_read(uuid);
drop function if exists public.admin_set_thread_status(uuid, text);
drop function if exists public.my_message_unread();
drop function if exists public.messages_check_rate(uuid);
drop table if exists public.messages;
drop table if exists public.message_threads;
