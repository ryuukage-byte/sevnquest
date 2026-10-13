-- ============================================================================
-- user_saves: penyimpanan save game penuh per pengguna (menggantikan user_metadata.cloud_save).
--
-- STATUS: DITERAPKAN 2026-10-13 ke proyek iokhdhqnpslpwsxspvaj (sevnquestnihongo) atas persetujuan pemilik.
-- Diterapkan bertahap lewat execute_sql (apply_migration timeout 60 dtk pada DDL; tidak ada perubahan setengah jalan
-- yang tertinggal). Dicatat di supabase_migrations.schema_migrations sebagai versi 20261013.
-- Klien (src/lib/supabase.ts: saveGameToCloud / loadGameFromCloud) menulis ke tabel ini pada simpan berikutnya dan
-- mengosongkan user_metadata.cloud_save (lazy migration); fallback ke user_metadata tetap ada bila tabel hilang.
-- File ini idempoten; aman dijalankan ulang di lingkungan lain (staging/lokal).
-- ============================================================================

create table if not exists public.user_saves (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  payload    jsonb       not null,
  updated_at timestamptz not null default now()
);

comment on table public.user_saves is 'Save game penuh per pengguna (CloudSavePayload). Satu baris per user.';

alter table public.user_saves enable row level security;

-- Pengguna hanya dapat membaca/menulis barisnya sendiri.
drop policy if exists user_saves_select_own on public.user_saves;
create policy user_saves_select_own on public.user_saves
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists user_saves_insert_own on public.user_saves;
create policy user_saves_insert_own on public.user_saves
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists user_saves_update_own on public.user_saves;
create policy user_saves_update_own on public.user_saves
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tidak ada akses untuk anon; tidak ada policy delete (hapus akun menghapus baris lewat ON DELETE CASCADE).
revoke all on public.user_saves from anon;
grant select, insert, update on public.user_saves to authenticated;
-- Default privilege Supabase memberi ALL ke authenticated pada tabel baru; cabut yang tidak dipakai (delete/truncate dst.).
revoke delete, truncate, references, trigger on public.user_saves from authenticated;
