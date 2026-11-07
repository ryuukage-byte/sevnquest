-- ============================================================================
-- messages: pesan dari pemain (akun login) ke admin, dan balasan admin ke pemain.
--
-- Model sederhana "kotak surat":
--   message_threads  = satu percakapan (subjek + kategori + status) milik satu pemain.
--   messages         = isi percakapan; from_admin menandai balasan admin.
--
-- Keamanan:
-- - Pemain hanya bisa MEMBACA percakapannya sendiri; admin (public.is_admin()) membaca semua.
-- - Semua penulisan lewat RPC security definer (create_message_thread, send_thread_message,
--   mark_message_thread_read, admin_set_thread_status); tidak ada INSERT/UPDATE langsung.
--   Penghapusan percakapan hanya admin (RLS).
-- - from_admin ditentukan server (is_admin() dan bukan pemilik percakapan), tidak bisa dipalsukan klien.
-- - Batas spam: maks 5 percakapan terbuka per pemain, maks 20 pesan per jam per pemain (admin bebas).
-- - Tamu (anon) tidak punya akses sama sekali: balasan hanya bisa diterima akun login.
--
-- Bergantung pada fungsi public.is_admin() yang sudah ada di proyek live.
-- STATUS: DITERAPKAN 2026-11-06 ke proyek iokhdhqnpslpwsxspvaj atas persetujuan pemilik,
-- tercatat di supabase_migrations.schema_migrations sebagai 20261106143940_messages. Hak akses diverifikasi:
-- anon tanpa akses tabel/RPC; authenticated hanya SELECT (+ DELETE dijaga RLS admin) dan EXECUTE RPC.
-- File ini idempoten; aman dijalankan ulang.
-- ============================================================================

create table if not exists public.message_threads (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users (id) on delete cascade,
  user_name       text        check (user_name is null or char_length(user_name) <= 60),
  subject         text        not null check (char_length(btrim(subject)) between 1 and 120),
  category        text        not null default 'general'
                              check (category in ('general', 'bug', 'account', 'suggestion')),
  status          text        not null default 'open' check (status in ('open', 'closed')),
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_sender     text        not null default 'user' check (last_sender in ('user', 'admin')),
  user_unread     integer     not null default 0 check (user_unread >= 0),
  admin_unread    integer     not null default 0 check (admin_unread >= 0)
);

comment on table public.message_threads is 'Percakapan pemain <-> admin. Tulis hanya lewat RPC.';

create index if not exists message_threads_user_idx on public.message_threads (user_id, last_message_at desc);
create index if not exists message_threads_inbox_idx on public.message_threads (status, last_message_at desc);

create table if not exists public.messages (
  id         uuid        primary key default gen_random_uuid(),
  thread_id  uuid        not null references public.message_threads (id) on delete cascade,
  sender_id  uuid        references auth.users (id) on delete set null,
  from_admin boolean     not null default false,
  body       text        not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

comment on table public.messages is 'Isi percakapan message_threads. Tulis hanya lewat RPC.';

create index if not exists messages_thread_idx on public.messages (thread_id, created_at);
create index if not exists messages_sender_recent_idx on public.messages (sender_id, created_at desc);

-- --------------------------------------------------------------------------- RLS

alter table public.message_threads enable row level security;
alter table public.messages enable row level security;

drop policy if exists message_threads_read on public.message_threads;
create policy message_threads_read on public.message_threads
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists message_threads_admin_delete on public.message_threads;
create policy message_threads_admin_delete on public.message_threads
  for delete to authenticated
  using (public.is_admin());

drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.message_threads t where t.id = thread_id and t.user_id = auth.uid())
  );

revoke all on public.message_threads from anon, authenticated;
revoke all on public.messages from anon, authenticated;
grant select, delete on public.message_threads to authenticated;
grant select on public.messages to authenticated;

-- --------------------------------------------------------------------------- Helper

-- Batas kirim pemain (bukan admin): maks 20 pesan per jam.
create or replace function public.messages_check_rate(p_uid uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.messages m
       where m.sender_id = p_uid and not m.from_admin and m.created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Terlalu banyak pesan. Coba lagi nanti.' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.messages_check_rate(uuid) from public, anon, authenticated;

-- --------------------------------------------------------------------------- RPC

-- Pemain membuat percakapan baru beserta pesan pertamanya. Mengembalikan id percakapan.
create or replace function public.create_message_thread(
  p_subject   text,
  p_category  text,
  p_body      text,
  p_user_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'Harus login untuk mengirim pesan.' using errcode = '42501';
  end if;
  if (select count(*) from public.message_threads where user_id = v_uid and status = 'open') >= 5 then
    raise exception 'Kamu masih punya 5 percakapan terbuka. Lanjutkan percakapan yang ada dulu.' using errcode = 'P0001';
  end if;
  perform public.messages_check_rate(v_uid);

  insert into public.message_threads (user_id, user_name, subject, category, admin_unread, last_sender)
  values (
    v_uid,
    nullif(left(btrim(coalesce(p_user_name, '')), 60), ''),
    btrim(p_subject),
    coalesce(nullif(p_category, ''), 'general'),
    1,
    'user'
  )
  returning id into v_id;

  insert into public.messages (thread_id, sender_id, from_admin, body)
  values (v_id, v_uid, false, btrim(p_body));

  return v_id;
end;
$$;

-- Kirim pesan ke percakapan yang ada (pemilik atau admin).
-- Pesan pemain membuka kembali percakapan yang sudah ditutup.
create or replace function public.send_thread_message(p_thread_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
  v_admin boolean;
  v_id    uuid;
begin
  if v_uid is null then
    raise exception 'Harus login untuk mengirim pesan.' using errcode = '42501';
  end if;
  select user_id into v_owner from public.message_threads where id = p_thread_id;
  if v_owner is null then
    raise exception 'Percakapan tidak ditemukan.' using errcode = 'P0002';
  end if;

  -- Admin yang membalas percakapan miliknya sendiri tetap dianggap pemain.
  v_admin := v_owner <> v_uid and public.is_admin();
  if v_owner <> v_uid and not v_admin then
    raise exception 'Akses ditolak.' using errcode = '42501';
  end if;
  if not v_admin then
    perform public.messages_check_rate(v_uid);
  end if;

  insert into public.messages (thread_id, sender_id, from_admin, body)
  values (p_thread_id, v_uid, v_admin, btrim(p_body))
  returning id into v_id;

  if v_admin then
    update public.message_threads
       set last_message_at = now(), last_sender = 'admin', user_unread = user_unread + 1, admin_unread = 0
     where id = p_thread_id;
  else
    update public.message_threads
       set last_message_at = now(), last_sender = 'user', admin_unread = admin_unread + 1, user_unread = 0,
           status = 'open'
     where id = p_thread_id;
  end if;

  return v_id;
end;
$$;

-- Tandai percakapan sudah dibaca oleh pihak pemanggil (pemain pemilik / admin).
create or replace function public.mark_message_thread_read(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
begin
  if v_uid is null then return; end if;
  select user_id into v_owner from public.message_threads where id = p_thread_id;
  if v_owner is null then return; end if;
  if v_owner = v_uid then
    update public.message_threads set user_unread = 0 where id = p_thread_id and user_unread <> 0;
  elsif public.is_admin() then
    update public.message_threads set admin_unread = 0 where id = p_thread_id and admin_unread <> 0;
  end if;
end;
$$;

-- Admin menutup / membuka kembali percakapan.
create or replace function public.admin_set_thread_status(p_thread_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Akses ditolak: akun ini bukan admin.' using errcode = '42501';
  end if;
  if p_status not in ('open', 'closed') then
    raise exception 'Status tidak valid.' using errcode = '22023';
  end if;
  update public.message_threads set status = p_status where id = p_thread_id;
end;
$$;

-- Jumlah belum dibaca untuk lencana navigasi: milik sendiri + (bila admin) kotak masuk admin.
create or replace function public.my_message_unread()
returns table (user_unread integer, admin_unread integer, am_admin boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select sum(t.user_unread)::int from public.message_threads t where t.user_id = auth.uid()), 0),
    case when public.is_admin()
      then coalesce((select sum(t.admin_unread)::int from public.message_threads t where t.user_id <> auth.uid()), 0)
      else 0 end,
    coalesce(public.is_admin(), false);
$$;

revoke all on function public.create_message_thread(text, text, text, text) from public, anon;
revoke all on function public.send_thread_message(uuid, text) from public, anon;
revoke all on function public.mark_message_thread_read(uuid) from public, anon;
revoke all on function public.admin_set_thread_status(uuid, text) from public, anon;
revoke all on function public.my_message_unread() from public, anon;
grant execute on function public.create_message_thread(text, text, text, text) to authenticated;
grant execute on function public.send_thread_message(uuid, text) to authenticated;
grant execute on function public.mark_message_thread_read(uuid) to authenticated;
grant execute on function public.admin_set_thread_status(uuid, text) to authenticated;
grant execute on function public.my_message_unread() to authenticated;
