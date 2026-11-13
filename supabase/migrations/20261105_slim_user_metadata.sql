-- ============================================================================
-- Perbaikan: save game lama di auth.users.raw_user_meta_data.cloud_save (50-413 KB, 648 akun per 2026-11-05)
-- ikut ke dalam JWT akses. Token sebesar itu ditolak gateway Supabase (520 / 400), sehingga SEMUA permintaan
-- akun tersebut gagal, termasuk simpan ke user_saves (yang dulu malah memicu fallback menulis ke metadata lagi).
--
-- Langkah (satu transaksi):
--   1. Cadangkan cloud_save ke sec_backup.user_meta_cloud_save_20261105 (bisa dipulihkan).
--   2. Salin ke public.user_saves bila belum ada baris, atau bila save di metadata lebih baru.
--   3. Hapus cloud_save dari metadata dan tandai cloud_save_migrated = true.
-- Token baru (setelah refresh) dibuat dari metadata yang sudah ramping. Klien me-refresh token yang
-- terlalu besar secara otomatis (src/lib/supabase.ts: refreshIfOversized).
-- Idempoten: aman dijalankan ulang.
-- ============================================================================

create schema if not exists sec_backup;

create table if not exists sec_backup.user_meta_cloud_save_20261105 (
  user_id               uuid primary key,
  cloud_save            jsonb,
  cloud_save_updated_at text,
  backed_up_at          timestamptz not null default now()
);
alter table sec_backup.user_meta_cloud_save_20261105 enable row level security;
revoke all on sec_backup.user_meta_cloud_save_20261105 from anon, authenticated;

insert into sec_backup.user_meta_cloud_save_20261105 (user_id, cloud_save, cloud_save_updated_at)
select id, raw_user_meta_data->'cloud_save', raw_user_meta_data->>'cloud_save_updated_at'
  from auth.users
 where jsonb_typeof(raw_user_meta_data->'cloud_save') = 'object'
on conflict (user_id) do nothing;

insert into public.user_saves (user_id, payload, updated_at)
select b.user_id, b.cloud_save, coalesce(b.ts, timestamptz '1970-01-01')
  from (
    select user_id, cloud_save,
           case when coalesce(cloud_save->>'updatedAt', cloud_save_updated_at) ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}'
                then coalesce(cloud_save->>'updatedAt', cloud_save_updated_at)::timestamptz end as ts
      from sec_backup.user_meta_cloud_save_20261105
  ) b
  join auth.users u on u.id = b.user_id
on conflict (user_id) do update
   set payload = excluded.payload, updated_at = excluded.updated_at
 where public.user_saves.updated_at < excluded.updated_at;

update auth.users
   set raw_user_meta_data = (raw_user_meta_data - 'cloud_save') || '{"cloud_save_migrated": true}'::jsonb
 where raw_user_meta_data ? 'cloud_save';
