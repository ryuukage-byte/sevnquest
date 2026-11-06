-- ============================================================================
-- announcements v2: opsi tampilan per broadcast + tanda "sudah dibaca" yang bisa dihitung admin.
-- Bergantung pada 20261106_announcements.sql dan public.is_admin().
-- File ini idempoten; aman dijalankan ulang.
-- ============================================================================

-- ---------- Opsi per broadcast ----------
alter table public.announcements
  add column if not exists display          text    not null default 'both',
  add column if not exists dismissible      boolean not null default true,
  add column if not exists popup_frequency  text    not null default 'once',
  add column if not exists min_read_seconds integer not null default 0,
  add column if not exists require_ack      boolean not null default false;

alter table public.announcements drop constraint if exists announcements_display_valid;
alter table public.announcements add constraint announcements_display_valid
  check (display in ('popup', 'banner', 'both'));

alter table public.announcements drop constraint if exists announcements_popup_frequency_valid;
alter table public.announcements add constraint announcements_popup_frequency_valid
  check (popup_frequency in ('once', 'every_open'));

alter table public.announcements drop constraint if exists announcements_min_read_valid;
alter table public.announcements add constraint announcements_min_read_valid
  check (min_read_seconds between 0 and 120);

comment on column public.announcements.display is 'popup | banner (kartu di dashboard) | both';
comment on column public.announcements.dismissible is 'false: pop-up tanpa tombol tutup (wajib konfirmasi) dan kartu dashboard tidak bisa disembunyikan sampai berakhir';
comment on column public.announcements.popup_frequency is 'once: sekali per perangkat; every_open: setiap aplikasi dibuka sampai berakhir';
comment on column public.announcements.min_read_seconds is 'Tombol konfirmasi terkunci selama N detik';
comment on column public.announcements.require_ack is 'Pemain wajib mencentang "Saya sudah membaca"';

-- ---------- Tanda baca ----------
-- reader_id = auth.uid() bila login, selain itu ID perangkat acak (nq_visitor_id, sama dengan app_visitors).
create table if not exists public.announcement_reads (
  announcement_id uuid        not null references public.announcements (id) on delete cascade,
  reader_id       uuid        not null,
  is_member       boolean     not null default false,
  read_at         timestamptz not null default now(),
  primary key (announcement_id, reader_id)
);

comment on table public.announcement_reads is 'Siapa yang sudah mengonfirmasi membaca pengumuman. Akses hanya lewat fungsi.';

alter table public.announcement_reads enable row level security;
revoke all on public.announcement_reads from anon, authenticated;

-- Catat "sudah dibaca". Hanya untuk pengumuman yang sedang tayang; login => pakai auth.uid() (tidak bisa dipalsukan).
create or replace function public.mark_announcement_read(p_announcement_id uuid, p_reader_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reader uuid := coalesce(auth.uid(), p_reader_id);
begin
  if v_reader is null then
    return;
  end if;
  if not exists (
    select 1 from public.announcements a
    where a.id = p_announcement_id
      and a.is_published
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
  ) then
    return;
  end if;
  insert into public.announcement_reads (announcement_id, reader_id, is_member)
  values (p_announcement_id, v_reader, auth.uid() is not null)
  on conflict (announcement_id, reader_id) do nothing;
end;
$$;

revoke all on function public.mark_announcement_read(uuid, uuid) from public;
grant execute on function public.mark_announcement_read(uuid, uuid) to anon, authenticated;

-- Statistik baca untuk admin.
create or replace function public.admin_announcement_stats()
returns table (announcement_id uuid, readers bigint, members bigint, guests bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
    select r.announcement_id,
           count(*)::bigint,
           count(*) filter (where r.is_member)::bigint,
           count(*) filter (where not r.is_member)::bigint
    from public.announcement_reads r
    group by r.announcement_id;
end;
$$;

revoke all on function public.admin_announcement_stats() from public;
grant execute on function public.admin_announcement_stats() to authenticated;
