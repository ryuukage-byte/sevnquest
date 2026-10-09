-- =============================================================================
-- HARNESS UJI LOKAL -- HANYA UNTUK DATABASE SEKALI PAKAI. JANGAN JALANKAN DI SUPABASE.
-- Membuat stand-in minimal untuk objek yang dipakai migrasi Guild (auth.users, auth.uid(), peran Supabase,
-- leaderboard, weekly_scores). Definisi kolom leaderboard/weekly_scores disalin dari skema live (hasil
-- list_tables), bukan ditebak.
-- =============================================================================

-- Penjaga: berhenti total bila ini terlihat seperti database SevnQuest sungguhan.
do $$
begin
  if current_database() not like 'guild_test%' then
    raise exception 'MENOLAK: nama database "%" bukan guild_test*', current_database();
  end if;
  if exists (select 1 from pg_namespace where nspname = 'sec_backup')
     or exists (select 1 from pg_tables where schemaname = 'public'
                 and tablename in ('vocabulary', 'kanji', 'user_mastery', 'user_activity', 'grammar')) then
    raise exception 'MENOLAK: database ini terlihat seperti database SevnQuest sungguhan';
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon')          then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role')  then create role service_role nologin; end if;
end $$;

create schema if not exists auth;
grant usage on schema auth, public to anon, authenticated, service_role;

create table auth.users (id uuid primary key default gen_random_uuid());
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

-- Meniru default privileges Supabase: objek baru di public otomatis terbuka untuk anon/authenticated.
-- Migrasi Guild harus mencabutnya sendiri; uji memastikan itu terjadi.
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create table public.leaderboard (
  user_id        text primary key,
  player_name    text not null default 'Petualang',
  level          integer not null default 1,
  total_exp      integer not null default 0,
  tier_index     integer not null default 0,
  avatar_url     text,
  stat_tryout    integer default 0,
  stat_flashcard integer default 0,
  stat_kanji     integer default 0,
  stat_boss      integer default 0,
  last_updated   timestamptz default timezone('utc', now()),
  exp_credit_at  timestamptz
);

create table public.weekly_scores (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  week_id     text not null,
  player_name text not null default 'Petualang',
  tier_index  integer not null default 0,
  score       integer not null default 0,
  avatar_url  text,
  updated_at  timestamptz default timezone('utc', now())
);
create unique index weekly_scores_user_week_unique on public.weekly_scores (user_id, week_id);
