-- ============================================================================
-- announcements: broadcast pengumuman dari admin ke semua pemain.
--
-- - Siapa pun (anon & login) hanya dapat MEMBACA pengumuman yang terbit dan masih dalam jendela waktunya.
-- - Hanya admin (public.is_admin() -> tabel public.admins) yang dapat membaca semua, membuat, mengubah, menghapus.
-- - Bergantung pada fungsi public.is_admin() yang sudah ada di proyek live.
-- STATUS: DITERAPKAN 2026-11-06 ke proyek iokhdhqnpslpwsxspvaj (sevnquestnihongo) atas persetujuan pemilik,
-- tercatat di supabase_migrations.schema_migrations sebagai 20261106130732_announcements. RLS diverifikasi:
-- anon & non-admin hanya melihat yang terbit; INSERT non-admin ditolak.
-- File ini idempoten; aman dijalankan ulang.
-- ============================================================================

create table if not exists public.announcements (
  id           uuid        primary key default gen_random_uuid(),
  title        text        not null check (char_length(btrim(title)) between 1 and 120),
  body         text        not null check (char_length(btrim(body)) between 1 and 8000),
  kind         text        not null default 'info' check (kind in ('info', 'update', 'important')),
  cta_label    text        check (cta_label is null or char_length(cta_label) between 1 and 40),
  cta_url      text        check (cta_url is null or (cta_url ~ '^https://' and char_length(cta_url) <= 500)),
  is_published boolean     not null default false,
  starts_at    timestamptz not null default now(),
  ends_at      timestamptz,
  created_by   uuid        default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint announcements_window_valid check (ends_at is null or ends_at > starts_at)
);

comment on table public.announcements is 'Pengumuman broadcast admin. Tulis hanya oleh admin (is_admin()).';

create index if not exists announcements_active_idx
  on public.announcements (starts_at desc) where is_published;

-- updated_at otomatis
create or replace function public.announcements_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists announcements_touch on public.announcements;
create trigger announcements_touch
  before update on public.announcements
  for each row execute function public.announcements_touch();

alter table public.announcements enable row level security;

-- Publik: hanya yang terbit & aktif.
drop policy if exists announcements_read_active on public.announcements;
create policy announcements_read_active on public.announcements
  for select to anon, authenticated
  using (is_published and starts_at <= now() and (ends_at is null or ends_at > now()));

-- Admin: baca semua (termasuk draf & yang sudah lewat).
drop policy if exists announcements_admin_read on public.announcements;
create policy announcements_admin_read on public.announcements
  for select to authenticated
  using (public.is_admin());

drop policy if exists announcements_admin_insert on public.announcements;
create policy announcements_admin_insert on public.announcements
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists announcements_admin_update on public.announcements;
create policy announcements_admin_update on public.announcements
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists announcements_admin_delete on public.announcements;
create policy announcements_admin_delete on public.announcements
  for delete to authenticated
  using (public.is_admin());

revoke all on public.announcements from anon, authenticated;
grant select on public.announcements to anon;
grant select, insert, update, delete on public.announcements to authenticated;
