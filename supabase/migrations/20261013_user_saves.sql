-- ============================================================================
-- user_saves: penyimpanan save game penuh per pengguna (menggantikan user_metadata.cloud_save).
--
-- STATUS: BELUM DITERAPKAN ke proyek Supabase mana pun. File ini hanya usulan yang ditinjau di PR.
-- Klien (src/lib/supabase.ts: saveGameToCloud / loadGameFromCloud) sudah mendukung tabel ini dan
-- jatuh kembali ke user_metadata bila tabel belum ada, jadi menerapkan migrasi ini AMAN & bertahap:
--   1) terapkan SQL ini,
--   2) klien menulis ke tabel pada simpan berikutnya dan mengosongkan user_metadata.cloud_save (lazy migration).
-- Skema remote yang terverifikasi (2026-10-13) TIDAK memiliki tabel ini.
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
